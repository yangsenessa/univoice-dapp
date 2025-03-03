import { mountStoreDevtool } from 'simple-zustand-devtools';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
// import { isLocalNet } from '@/utils/env';

const isDev = true //isLocalNet();
const expire_ms = 24 * 60 * 60 * 1000;
const buildExpire = () => {
  return new Date().getTime() + expire_ms;
}

// =========================== data persistence ===========================
interface AccountState {
  wallet: string;
  principal: string;
  expire: number; // Login expiration(ms)
  setUserByWallet: (wallet_type: string, principal_id: string) => void;
  clearAccount: () => void;
  getWalletType: () => string;
  getPrincipal: () => string;
  hasExpired: () => boolean;
}

export const useAcountStore = create<AccountState>()(
  devtools(
    persist(
      (set,get) => ({
        wallet: '',
        principal: '',
        expire: 0,
        setUserByWallet: (wallet_type, principal_id) => {
          set({
            wallet: wallet_type,
            principal: principal_id,
            expire: buildExpire()
          });
        },
        clearAccount: () => {
          set({
            wallet: '',
            principal: '',
            expire: 0
          });
        },
        getPrincipal: () => {
          return get().hasExpired() ? '' : get().principal;
        },
        getWalletType: () => {
          return get().hasExpired() ? '' : get().wallet;
        },
        hasExpired: (): boolean => {
          return get().expire < new Date().getTime();
        }
      }),
      {
        name: '__univoice_dapp__',
      },
    ),
    {
      enabled: isDev,
    },
  ),
);

isDev && mountStoreDevtool('AppStore', useAcountStore);