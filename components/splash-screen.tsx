"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Package, ShoppingBag, Tag, Truck } from "lucide-react";

const shoppingIcons = [
  { className: "welcome-icon-package", Icon: Package, color: "#e98a32", delay: 0 },
  { className: "welcome-icon-bag", Icon: ShoppingBag, color: "#078d7b", delay: 0.35 },
  { className: "welcome-icon-tag", Icon: Tag, color: "#7652c6", delay: 0.7 },
  { className: "welcome-icon-delivery", Icon: Truck, color: "#e16c54", delay: 1.05 },
];

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="welcome-screen"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <motion.div
            className="welcome-halo welcome-halo-one"
            animate={shouldReduceMotion ? { x: "-50%", y: "-50%" } : { x: "-50%", y: "-50%", scale: [0.92, 1.08, 0.92], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="welcome-halo welcome-halo-two"
            animate={shouldReduceMotion ? { x: "-50%", y: "-50%" } : { x: "-50%", y: "-50%", scale: [1.08, 0.92, 1.08], opacity: [0.45, 0.9, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="welcome-orbit welcome-orbit-one"
            animate={shouldReduceMotion ? { x: "-50%", y: "-50%" } : { x: "-50%", y: "-50%", rotate: 360 }}
            transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="welcome-orbit welcome-orbit-two"
            animate={shouldReduceMotion ? { x: "-50%", y: "-50%" } : { x: "-50%", y: "-50%", rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
          {shoppingIcons.map(({ className, Icon, color, delay }) => (
            <motion.div
              key={className}
              className={`welcome-icon ${className}`}
              style={{ color }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -12, 0], rotate: [-5, 5, -5] }}
              transition={{ duration: 2.8, delay, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
            >
              <Icon />
            </motion.div>
          ))}
          <motion.span
            className="welcome-spark welcome-spark-one"
            animate={shouldReduceMotion ? undefined : { opacity: [0.4, 1, 0.4], scale: [0.7, 1.25, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="welcome-spark welcome-spark-two"
            animate={shouldReduceMotion ? undefined : { opacity: [1, 0.4, 1], scale: [1.2, 0.7, 1.2] }}
            transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="welcome-spark welcome-spark-three"
            animate={shouldReduceMotion ? undefined : { opacity: [0.4, 1, 0.4], scale: [0.7, 1.2, 0.7] }}
            transition={{ duration: 1.8, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="welcome-logo-position">
            <motion.div
              className="welcome-logo"
              initial={{ opacity: 0, scale: 0.72, rotate: -8 }}
              animate={shouldReduceMotion ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 1, scale: 1, rotate: 0, y: [0, -7, 0] }}
              transition={{ duration: shouldReduceMotion ? 0.01 : 2.4, repeat: shouldReduceMotion ? 0 : Infinity, ease: "easeInOut" }}
            >
              <img src="/swag%20shopping%20logo.jpeg" alt="" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
