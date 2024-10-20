'use client';

import { useState, useEffect } from 'react';
import Tree from 'react-d3-tree';

// Sample tree data
const treeData = {
  name: 'Project Root',
  children: [
    {
      name: 'src',
      children: [
        { name: 'app' },
        { name: 'components' },
        { name: 'styles' },
      ],
    },
    {
      name: 'public',
      children: [
        { name: 'images' },
      ],
    },
    { name: 'package.json' },
    { name: 'README.md' },
  ],
};

export default function Home() {

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <input type="text" />
      <div className="flex flex-1">
        <div className="w-3/5 border border-red-500">
          {isMounted && (
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
          Hello World
        </div>
      </div>
    </div>
  );
}
