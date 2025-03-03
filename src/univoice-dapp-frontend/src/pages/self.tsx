import { useEffect, useState } from 'react';
import { fmtInt, fmtUvBalance, fmtTimestamp, fmtSummaryAddr } from '@/utils';
import { call_tokens_of, getWalletPrincipal, queryBalance as queryWalletBalance } from '@/utils/wallet'
import style from './self.module.scss'
import ImgNftThum from '@/assets/imgs/nft_thum.png'
import { toastSuccess, toastError, toastWarn } from '@/components/toast';
import { ERROR_MSG } from '@/utils/uv_const';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/modal-dialog'

// import {fetch_sumary_for_myvoice, claim_to_account_by_principal, get_miner_jnl} from "@/utils/call_dapp_backend";
import { useAcountStore } from '@/stores/user';
function SelfPage() {
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState({
    rewards: '',
    claimable: '',
  });
  const [licenseData, setLicenseData] = useState<any>([]);
  const [claimable, setClaimable] = useState(true)
  const { getPrincipal } = useAcountStore();
  const [walletBalance, setWalletBalance] = useState('')

  const handleBack = () => {
    window.history.back();
  };

  const handleGoDashboard = () => {
    navigate('/dashboard');
  };

  const refreshBalance = () => {
    if (getPrincipal() === '') {
      return
    }
    queryWalletBalance().then((balance) => {
      if (balance) {
        setWalletBalance(Number(balance).toString())
      }
    }).catch((e) => {
      setWalletBalance('')
      toastWarn('Failed to query balance data: ' + e.toString())
    })
  }

  const getPrincipalStr = (len1: number, len2: number) => {
    const pid = getPrincipal()
    return pid.substring(0, len1) + '...' + pid.substring(pid.length - len2);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    getWalletPrincipal().then(pid => {
      if(pid){
        refreshBalance();
        loadSummary();
        loadLicense();
      }
    }).catch(e => {
      toastError('Failed to load page data: ' + e.toString())
    });
  }, [getPrincipal()]);
  
  const loadSummary = () => {
    let data={
      rewards: '',
      claimable: '',
    };
    
    const principal_id = getPrincipal();
    if(!principal_id) {
      // toastWarn('Failed to query my performance data: ' + ERROR_MSG.USER_NOT_AUTH)
      return;
    }
    // fetch_sumary_for_myvoice(principal_id)
    //   .then( sum_tokens => {
    //     data.claimable = String(sum_tokens.sum_unclaimed);
    //     data.rewards = String(sum_tokens.sum_claimed);
    //     setSummaryData(data);
    //   }).catch(e => {
    //     toastWarn('Failed to query my performance data!')
    //   });
    data.claimable = '28541012000000';
    data.rewards = '28541012000000';
    setSummaryData(data);
  }

  const catchNftImgFail = (event) => {
    event.target.src = ImgNftThum
  }

  const loadLicense = () => {
    const dataItem ={ 
       id: 1,
       imgurl: 'https://bafybeibhnv326rmac22wfcxsmtrbdbzjzn5mviykq3rbt4ltqkqqfgobga.ipfs.w3s.link/thum.jpg',
       idx: '01',
       intro: 'Univoice listener',
       quantity: 1,
       myhashs: ''
    }

    const data = [];
              
    call_tokens_of().then(tokenIds=>{
      let owner_cnt = 0;
      let myhash_str = "";
      console.log("Origin nft tokens is",tokenIds);

      for (let token_id in tokenIds) {
        console.log("hold license of token_id", tokenIds[token_id]);
        owner_cnt +=1;
        myhash_str += '#'+tokenIds[token_id]+',';
      }
      dataItem.myhashs = myhash_str;
      dataItem.quantity = owner_cnt;
      dataItem.imgurl = ImgNftThum;
      if (owner_cnt > 0) {
        data[0] = dataItem;
      }
      console.log('data', data)
      setLicenseData(data);
    })      
  }

  const clickClaim = () => {
    if(!getPrincipal()){
      toastWarn('Failed to claim rewards: ' + ERROR_MSG.USER_NOT_AUTH)
      return
    }
    // TODO
    // claim_to_account_by_principal(getPrincipal()).then(trans_tokens=>{
    //   toastSuccess("You have claimed "+String(trans_tokens)+" success. You can recheck by your wallet.");
    //   loadSummary();
    //   setClaimable(false)
    // });
  }

  const [mSendOpen, setMSendOpen] = useState(false)
  const onCloseMSend = () => {
    setMSendOpen(false)
  }
  const openMSend = () => {
    setMSendOpen(true)
  }

  const [mReceiveOpen, setMReceiveOpen] = useState(false)
  const onCloseMReceive = () => {
    setMReceiveOpen(false)
  }
  const openMReceive = () => {
    setMReceiveOpen(true)
  }

  const handleClickCopyPrincipal = () => {
    navigator.clipboard.writeText(getPrincipal())
  }

  const [sendTargetPId, setSendTargetPId] = useState('')

  // const handleInputSendTarget = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.value.length > 6) return;
  //   setSendTargetPId(e.target.value);
  // };

  const handleSubmitSend = () => {
    // TODO
    onCloseMSend();
  }
  
  return (
    <div className="main-container">
      <div className={`top-nav-bar ${style.topBar}`}>
        <div className={style.topBarWrapper}>
          <div className={style.btnBack} onClick={handleBack}></div>
          <div className={style.welcome}>Welcome</div>
        </div>
      </div>
      <div className="uvpage-2">
        <div className={style.pgSelf}>

          <div className={style.userInfo}>
            <div className={style.avatar}></div>
            <div className={style.col2}>
              <div className={style.name}>{getPrincipalStr(5,3)}</div>
              <div className={style.btnGoDashboard} onClick={handleGoDashboard}>
                <span>Dashboard</span>
                <div className={style.icon}></div>
              </div>
            </div>
          </div>

          <div className={style.dataPanel}>
            <div className={style.mainPanel}>
              <div className={style.selfData}>
                <div className={style.accInfo}>
                  <div className={style.label}><p>Total</p><p>Balance</p></div>
                  <div className={style.amountInfo}>
                    <div className={style.unit}>$UVC</div>
                    <div className={style.amount}>{
                      walletBalance ==='' ?
                      '--' :
                      fmtUvBalance(walletBalance)
                    }</div></div>
                </div>
                <div className={style.opBalance}>
                  <div className={style.btn} onClick={openMSend}>
                    <div className={style.btnIconSend}></div>
                    <p>Send</p>
                  </div>
                  <div className={style.btn} onClick={openMReceive}>
                    <div className={style.btnIconReceive}></div>
                    <p>Receive</p>
                  </div>
                </div>
                <div className={style.accInfo}>
                  <div className={style.label}><p>Claimable</p><p>Rewards</p></div>
                  <div className={style.amountInfo}>
                    <div className={style.unit}>$UVC</div>
                    <div className={style.amount}>{summaryData.claimable === '' ? '--' : fmtUvBalance(summaryData.claimable)}</div></div>
                </div>
                <div className={style.btnClaim}>Claim</div>
              </div>
            </div>
            <div className={style.bg2}></div>
            <div className={style.bg1}></div>
          </div>

          <div className={style.licensePanel}>
            <div className={style.titleBar}>
              <div className={style.title}>Licenses holded</div>
              <div className={style.btnGetMore} onClick={handleGoDashboard}>
                <div className={style.icon}></div>
                <span>Get More</span>
              </div>
            </div>
          </div>

          {
          licenseData.length === 0 ? 
          <div className="nodata">
            <div className="nodata-img"></div>
            <div className="nodata-txt">No data</div>
          </div>
          :
          <div className={style.nfts}>
            {licenseData.map((el: { id: string; imgurl: string; intro: string; quantity: number}) => (
            <div key={el.id} className={`${style.nft} aspect-ratio-1-1`}>
              <div className={`${style.nft_wrap} aspect-ratio-wrap`}>
                <img className={`img-fixed ${style.img}`} src={el.imgurl} onError={catchNftImgFail} />
                <div className={style.info}>
                  <div className={style.infoctx}>
                    <div className={style.intro}>{el.intro}</div>
                    <div className={style.quantity}>
                      <div className={style.lab}>Quantity</div>
                      <div>+{el.quantity}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
          }
        </div>
      </div>
      <Modal
        isOpen={mReceiveOpen} onClose={onCloseMReceive} overlayClassName={undefined} contentClassName={undefined}>
        <div className="md-title"></div>
        <div className={style.modalMyPId}><div className={style.pid}>{getPrincipal()}</div><div className={style.copyIcon} onClick={handleClickCopyPrincipal}></div></div>
        <div className={style.modalTip}>Please inform the other party of this ID</div>
      </Modal>
      <Modal
        isOpen={mSendOpen} onClose={onCloseMSend} overlayClassName={undefined} contentClassName={undefined}>
        <div className="md-title">Send</div>
        
        <div className={style.iptSendTarget}>
          <input
            type="text"
            placeholder="Enter Target Principal ID"
            value={sendTargetPId}
            // onChange={handleInputSendTarget}
            onChange={(e) => setSendTargetPId(e.target.value)}
          />
        </div>
        <div className={`${style.btnSubmitSend} btn-1 md-btn-1`} onClick={handleSubmitSend}>Confirm Send</div>
      </Modal>
    </div>
  );
}
    
export default SelfPage;