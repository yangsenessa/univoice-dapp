import style from './wallet-login.module.scss'
import { useAcountStore } from '@/stores/user';
import { checkPlugReady, reConnectPlug } from '@/utils/icplug';
import { toastInfo, toastError, toastWarn } from '@/components/toast';
import { WALLET_TYPE } from '@/utils/uv_const'

const WalletLogin = ({
  onClose
}) => {
  const { setUserByWallet, getPrincipal } = useAcountStore();

  const handleLoginPlug = () => {
    if (!checkPlugReady()) {
      toastInfo('Please install plug-wallet extension first');
      return
    }
    loginPlug();
  }

  const loginPlug = () => {
    reConnectPlug().then((principal_id) => {
      if (!principal_id) return;
      setUserByWallet(WALLET_TYPE.PLUG, principal_id)
      onClose()
    }).catch((e) => {
      toastError('Failed to connect wallet! ' + e.toString())
    })
  }

  return (
    <>
      <div className="md-title">Connect Wallet</div>
      <div className={style.tip}>Choose your wallet</div>
      <div className={style.walletItem} onClick={handleLoginPlug}>
        <div className={style.iconPlug}></div>
        <div className={style.walletName}>Plug Wallet</div>
      </div>
    </>
  )
}

export default WalletLogin;