import { createContext, useContext, type ReactNode } from "react";
import {
  useThreadsAuthorAvatars,
  type ThreadsAuthorAvatarResolver,
} from "@/hooks/useThreadsAuthorAvatars";

const noop: ThreadsAuthorAvatarResolver = {
  getAvatar: () => null,
  selfUsername: null,
  selfAvatar: null,
};

const Ctx = createContext<ThreadsAuthorAvatarResolver>(noop);

export function ThreadsAuthorAvatarProvider({
  accountId,
  children,
}: {
  accountId: string | null;
  children: ReactNode;
}) {
  const value = useThreadsAuthorAvatars(accountId);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useThreadsAuthorAvatarContext(): ThreadsAuthorAvatarResolver {
  return useContext(Ctx);
}