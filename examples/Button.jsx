// React to PPT 示例组件
// 演示一个完整、实用的按钮组件

import React, { useState, useEffect } from 'react';

// 按钮尺寸选项
const SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};

// 按钮变体
const VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  OUTLINE: 'outline',
  GHOST: 'ghost'
};

/**
 * Button - 可复用的按钮组件
 * 支持多种尺寸、变体和状态
 */
const Button = ({
  children = 'Click me',
  variant = VARIANTS.PRIMARY,
  size = SIZES.MEDIUM,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) => {
  // 加载状态管理
  const [isLoading, setIsLoading] = useState(loading);
  
  // 点击次数统计（仅用于演示 hooks）
  const [clickCount, setClickCount] = useState(0);
  
  // 处理点击
  const handleClick = async (e) => {
    if (disabled || isLoading) return;
    
    setClickCount(prev => prev + 1);
    
    if (onClick) {
      setIsLoading(true);
      try {
        await onClick(e);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // 点击次数达到 10 次的提示
  useEffect(() => {
    if (clickCount === 10) {
      console.log('🎉 你点击了 10 次！');
    }
  }, [clickCount]);
  
  // 尺寸映射
  const sizeClasses = {
    small: 'px-2 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  // 变体样式
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'text-blue-600 hover:bg-blue-50'
  };
  
  const classes = `
    btn
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? '⏳' : children}
    </button>
  );
};

// 导出方式：默认导出
export default Button;

// 命名导出
export { SIZES, VARIANTS };
