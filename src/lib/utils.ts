import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * @description 조건부 클래스를 합치고 Tailwind 충돌을 뒤엣것 우선으로 정리한다. shadcn 고정 경로.
 * @param inputs - 클래스 값들
 * @returns 병합된 className
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
