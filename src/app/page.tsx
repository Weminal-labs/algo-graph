'use client';

import { useState, useEffect, useCallback } from 'react';
import Tree from 'react-d3-tree';
import axios from 'axios';
import genAI from '@/lib/gemini';
import ReactMarkdown from 'react-markdown';

// Sample tree data
interface TreeNode {
  name: string;
  content?: string;
  children?: TreeNode[];
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');
  const debouncedGithubUrl = useDebounce(githubUrl, 1000);
  const [isLoading, setIsLoading] = useState(false);
  const [analyseContent, setAnalyseContent] = useState<string>('');
  const [analyzeResult, setAnalyzeResult] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const match = debouncedGithubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const [, owner, repo] = match;
      fetchRepoStructure(owner, repo);
    } else {
      console.log('No match found');
    }
  }, [debouncedGithubUrl]);

  const fetchRepoStructure = useCallback(async (owner: string, repo: string) => {
    try {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }
      setIsLoading(true);
      const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;

      if (!token) {
        console.warn('GitHub token not found in environment variables');
      }

      const root = await fetchAllFiles(owner, repo, token);
      console.log(root)
      setTreeData(root);
    } catch (error) {
      console.error('Error fetching repo structure:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllFiles = async (owner: string, repo: string, token: string | null = null) => {
    const rootNode: TreeNode = { name: repo, children: [] };

    async function fetchContents(path = '', parentNode: TreeNode) {
      const contents = await getRepoContents(owner, repo, path, token);
      for (const item of contents) {
        if (item.type === 'file') {
          const fileContent = await axios.get(item.download_url);
          parentNode?.children?.push({
            name: item.name,
            content: fileContent.data
          });
        } else if (item.type === 'dir') {
          const newFolder: TreeNode = { name: item.name, children: [] };
          parentNode?.children?.push(newFolder);
          await fetchContents(item.path, newFolder);
        }
      }
    }

    await fetchContents('', rootNode);
    return rootNode;
  };

  const getRepoContents = async (owner: string, repo: string, path = '', token: string | null = null) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = token ? { Authorization: `token ${token}` } : {};
    const response = await axios.get(url, { headers });
    return response.data;
  };

  const handleNodeClick = (nodeData: any) => {
    if (nodeData.data.content !== undefined) {
      setAnalyseContent(nodeData.data.content);
    } else {
      setAnalyseContent('This is a directory.');
    }
  };

  const analyzeRepo = async () => {
    if (!treeData) {
      setAnalyzeResult('No repository data available to analyze.');
      return;
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Analyze this GitHub repository structure and the content of the selected file:

Repository Structure:
${JSON.stringify(treeData, null, 2)}

Selected File Content:
${analyseContent}

Please provide insights (relationships between files, dependencies, etc.) on the repository structure and the content of the selected file.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setAnalyzeResult(text);
    } catch (error) {
      console.error('Error analyzing repository:', error);
      setAnalyzeResult('An error occurred while analyzing the repository.');
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <input
        type="text"
        value={githubUrl}
        onChange={(e) => setGithubUrl(e.target.value)}
        placeholder="Enter GitHub repository URL"
        className="p-2 border border-gray-300 rounded"
      />
      <div className="flex flex-1">
        <div className="w-3/5 border border-red-500">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p>Loading repository structure...</p>
            </div>
          ) : (
            isMounted && treeData && (
              <Tree
                data={treeData}
                orientation="horizontal"
                pathFunc="step"
                translate={{ x: 100, y: 200 }}
                separation={{ siblings: 1.5, nonSiblings: 2 }}
                nodeSize={{ x: 300, y: 50 }}
                onNodeClick={handleNodeClick}
                scaleExtent={{ min: 0.5, max: 1 }}
              />
            )
          )}
        </div>
        <div className="w-2/5 border border-blue-500 p-4 overflow-auto flex flex-col">
          {/* <pre className="whitespace-pre-wrap flex-1">{analyseContent}</pre> */}
          <div className="mt-4">
            <button
              onClick={analyzeRepo}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={!treeData}
            >
              Analyze Repository
            </button>
            {analyzeResult && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-bold mb-2">Analysis Result:</h3>
                <ReactMarkdown>{analyzeResult}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
