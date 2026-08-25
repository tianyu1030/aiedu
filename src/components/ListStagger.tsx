"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { motion, type Variants } from "framer-motion";

/**
 * ListStagger：列表父容器，staggerChildren=0.05 的错位淡入效果。
 *  内部列表项请使用 <StaggerItem />（motion.li），否则子项不会有 stagger 动画。
 *
 *  用法：
 *    <ListStagger className="...">
 *      {items.map(i => <StaggerItem key={i}>...</StaggerItem>)}
 *    </ListStagger>
 */

const parentVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.02 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

type ListStaggerProps = HTMLAttributes<HTMLUListElement> & {
  children: ReactNode;
};

export default function ListStagger({
  children,
  className,
  ...rest
}: ListStaggerProps) {
  const MotionUl = motion.ul as any;
  return (
    <MotionUl
      variants={parentVariants}
      initial="hidden"
      animate="show"
      className={className}
      {...rest}
    >
      {children}
    </MotionUl>
  );
}

type StaggerItemProps = HTMLAttributes<HTMLLIElement> & {
  children: ReactNode;
};

/**
 * StaggerItem：配合 ListStagger 使用的列表项。
 *  直接 export，便于调用方使用命名导入。
 */
export function StaggerItem({
  children,
  className,
  ...rest
}: StaggerItemProps) {
  const MotionLi = motion.li as any;
  return (
    <MotionLi variants={itemVariants} className={className} {...rest}>
      {children}
    </MotionLi>
  );
}

export { ListStagger };
