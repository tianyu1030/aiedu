"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";

/**
 * MotionButton：基于 framer-motion 的按钮包装。
 *  - whileTap scale 0.96，spring 过渡。
 *  - 支持原生 button 所有属性（type / onClick / disabled / className 等）。
 *  - 登录/注册/所有业务按钮可替换使用。
 */
type MotionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  function MotionButton({ children, className, disabled, ...rest }, ref) {
    return (
      <motion.button
        ref={ref}
        disabled={disabled}
        whileTap={disabled ? undefined : { scale: 0.96 }}
        whileHover={disabled ? undefined : { y: -1 }}
        transition={{ type: "spring", stiffness: 420, damping: 24 }}
        className={className}
        {...(rest as any)}
      >
        {children}
      </motion.button>
    );
  }
);

export default MotionButton;
export { MotionButton };
