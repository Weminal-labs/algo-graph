'use client';

import { useState, useEffect } from 'react';
import Tree from 'react-d3-tree';
import axios from 'axios';

// Sample tree data
interface TreeNode {
  name: string;
  content?: string;
  children?: TreeNode[];
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode | null>(null);
  const [githubUrl, setGithubUrl] = useState<string>('');

  useEffect(() => {
    setIsMounted(true);
    fetchRepoStructure("ipaleka", "algorand-contracts-testing");
  }, []);

  const fetchRepoStructure = async (owner: string, repo: string) => {
    try {
      if (!owner || !repo) {
        throw new Error('Owner and repo are required');
      }
      
      const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;

      if (!token) {
        console.warn('GitHub token not found in environment variables');
      }

      const root = await fetchAllFiles(owner, repo, token);
      setTreeData(root);
    } catch (error) {
      console.error('Error fetching repo structure:', error);
    }
  };

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

  return (
    <div className="flex flex-col h-screen">
      <input type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
      <div className="flex flex-1">
        <div className="w-3/5 border border-red-500">
          {isMounted && treeData && (
            <Tree
              data={treeData}
              orientation="horizontal"
              pathFunc="diagonal"
              translate={{ x: 300, y: 50 }}
              separation={{ siblings: 2, nonSiblings: 2 }}
            />
          )}
        </div>
        <div className="w-2/5 border border-blue-500">
          {/* Content for the right panel */}
        </div>
      </div>
    </div>
  );
}
