import { useStore } from '@/core/zustand';

export const useSession = () => useStore(state => state.auth.session);
