import * as React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
}

function Tooltip({ content, children }: TooltipProps) {
  return React.cloneElement(children, { title: content });
}

export { Tooltip };
