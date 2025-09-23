import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

const projectId = (import.meta as any).env?.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = getDefaultConfig({
  appName: 'PrivateGrade',
  projectId,
  chains: [sepolia],
  ssr: false,
});
