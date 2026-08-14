import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * @description 페이지 본문 공통 래퍼. 프로토타입의 .wrap과 같은 폭을 유지한다.
 * @param props.children - 본문
 * @param props.className - 추가 클래스
 */
export default function PageContainer({
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1080px] px-4 py-6", className)}>
      {children}
    </div>
  );
}
