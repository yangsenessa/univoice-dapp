import { useEffect, useState } from 'react';
import { fmtInt, fmtUvBalance, fmtTimestamp, fmtSummaryAddr } from '@/utils';
import style from './dashboard.module.scss'
import ImgNftThum from '@/assets/imgs/nft_thum.png'
// import { get_nft_collection } from 'declarations/univoice-dapp-backend/univoice-dapp-backend.did'
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState({
    tokenPoolAmount: 0,
    totalListener: 0,
    blockCreatedNumber: 0,
    totalTransactions: 0,
    blockProduceSpeed: 0,
    tokensPerBlocks: 0,
  });
  const [licenseData, setLicenseData] = useState<any>([]);
  useEffect(() => {
    window.scrollTo(0, 0)
    loadSummary()
    loadLicense()
  }, []);
  
  const loadSummary = async() => {
    let data = {
      tokenPoolAmount:2100000000000,
      totalListener: 2100,
      blockCreatedNumber: 123456,
      totalTransactions: 123456789123456,
      blockProduceSpeed: 123.456,
      tokensPerBlocks: 12345600000000,
    }
    setSummaryData(data);
    // get_main_site_summary()
    //   .then(mainsite_summary=>{
    //     let data = summaryData;
    //     data.blockCreatedNumber = Number(mainsite_summary.aigcblock_created_number);
    //     data.tokensPerBlocks = Number(mainsite_summary.token_per_block) ;
    //     data.totalListener = Number(mainsite_summary.listener_count) ;
    //     data.tokenPoolAmount = Number(mainsite_summary.token_pool_balance);
    //     data.blockProduceSpeed = 900;
    //     setSummaryData(data);
    //   }).catch(e => {
    //     toastWarn('Failed to query dashboard data!')
    //   });
  }

  const catchNftImgFail = (event) => {
    event.target.src = ImgNftThum
  }

  const loadLicense = () => {
    // get_nft_collection().then( result => {
    //   console.log(result)
    //   setLicenseData(result.data)
    // })
    let index = 0;
    let data =[];
    let license_item = {
      collectionId: '1',
      name: 'Univoice Listener',
      symbol: '',
      description: 'A liciense for identify as Univoice-Listener.',
      logo: 'https://bafybeibhnv326rmac22wfcxsmtrbdbzjzn5mviykq3rbt4ltqkqqfgobga.ipfs.w3s.link/thum.jpg'
    }
    let license_item2 = {
      collectionId: '2',
      name: 'Univoice Listener',
      symbol: '',
      description: 'A liciense for identify as Univoice-Listener.A liciense for identify as Univoice-Listener.A liciense for identify as Univoice-Listener.A liciense for identify as Univoice-Listener.A liciense for identify as Univoice-Listener.A liciense for identify as Univoice-Listener.',
      logo: 'https://bafybeibhnv326rmac22wfcxsmtrbdbzjzn5mviykq3rbt4ltqkqqfgobga.ipfs.w3s.link/thum.jpg'
    }
    data[index]=license_item;
    data[1]=license_item2;
    data[2]=license_item;
    data[3]=license_item;
    data[4]=license_item;
    console.log("license_item",data);
    setLicenseData(data);
  }

  // const loadTokenPoolAmount =  (data) => {
  //   let balance:BigInt =BigInt(0) ;
  //    poll_balance().then(result=>{
  //        console.log("Call pool balance = "+ String(result));
  //        if("Ok" in result) {
  //           balance = (result as {'Ok': BigInt}).Ok;
  //           console.log("Call pool balance Ok ",balance);
  //           let newData = data;
  //           data.tokenPoolAmount= Number(balance);
  //           setSummaryData(data);
  //         }
  //         if("Err" in result) {
  //           console.log("Balance result Err");
  //         }
  //    })
  // }

  // const load_total_listener =  (data):Number=>{
  //   let count:number = 0;
  //   get_total_listener().then(result =>{
  //     console.log("get_total_listener pre =",result);
  //     if(result) {
  //         console.log("get_total_listener=",result)
  //         count =  Number(result);
          
  //         data.totalListener = count;
  //     }
  //   })
  //   return count;
  // }

  const handleBuy = (collectionId: string) => {
    navigate('/licensedetail/'+collectionId)
  }

  return (
    <div className={style.pgMyvoice}>
      <div className="page-name">Dashboard</div>
      <div className={style.summary}>
        <div className={style.item}>
          <div className={style.label}>Token Pool Amount</div>
          <div className={style.data}>
            <div className={style.val}>{summaryData.tokenPoolAmount === 0 ? '--' : fmtUvBalance(summaryData.tokenPoolAmount)}</div>
            <div className={style.unit}>$UVC</div>
          </div>
        </div>
        <div className={style.item}>
          <div className={style.label}>Total Listener</div>
          <div className={style.data}>
          <div className={style.val}>{summaryData.totalListener === 0 ? '--' : fmtInt(summaryData.totalListener)}</div>
          </div>
        </div>
        <div className={style.item}>
          <div className={style.label}>Block Created Number</div>
          <div className={style.data}>
            <div className={style.val}>{summaryData.blockCreatedNumber === 0 ? '--' : fmtInt(summaryData.blockCreatedNumber)}</div>
            <div className={style.unit}>Blocks</div>
          </div>
        </div>
        <div className={style.item}>
          <div className={style.label}>Total Transactions</div>
          <div className={style.data}>
            <div className={style.val}>{summaryData.totalTransactions === 0 ? '--' : fmtInt(summaryData.totalTransactions)}</div>
            <div className={style.unit}>TX</div>
          </div>
        </div>
        <div className={style.item}>
          <div className={style.label}>Block Produce Speed</div>
          <div className={style.data}>
            <div className={style.val}>{summaryData.blockProduceSpeed === 0 ? '--' : fmtInt(summaryData.blockProduceSpeed)}</div>
          </div>
        </div>
        <div className={style.item}>
          <div className={style.label}>Tokens Per-Blocks</div>
          <div className={style.data}>
          <div className={style.val}>{summaryData.tokensPerBlocks === 0 ? '--' : fmtUvBalance(summaryData.tokensPerBlocks)}</div>
          </div>
        </div>
      </div>
      
      <div className={style.pTitle}>License Gallery</div>
      <div className={style.nfts}>
        {licenseData.map((el: { collectionId: string; logo: string; name: string; description: string}) => (
        <div key={el.collectionId} className={`${style.nft} `}>
          <img className={`img-fixed ${style.img}`} src={el.logo} onError={catchNftImgFail} />
          <div className={style.info}>
            <div className={style.infoctx}>
              <div className={style.name}>{el.name}</div>
              <div className={style.description}>{el.description}</div>
            </div>
            <div className={style.btnBuy} onClick={() => {handleBuy(el.collectionId)}}>Buy</div>
          </div>
        </div>
        ))}
      </div>
    </div>
  );
}
    
export default DashboardPage;