import { useEffect, useState } from 'react';
import style from './friends.module.scss'
import { useNavigate } from 'react-router-dom';
import { useAcountStore } from '@/stores/user';
import { fmtInt } from '@/utils/index';
import Modal from '@/components/modal-dialog'
import Default_Avatar from '@/assets/imgs/user_avatar.png'

function FriendsPage() {
  const navigate = useNavigate();
  
  const { getPrincipal } = useAcountStore();
  const [list, setList] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    // let result = await getFriends(getPrincipal())
    let result = {
      friends: [
        {
          name: 'Jimmy1',
          avatar: '',
          friendnum: 0,
          rewards: 5000
        }, {
          name: 'Jimmy2',
          avatar: 'https://avatars.githubusercontent.com/u/1029040?v=4',
          friendnum: 1,
          rewards: 5000
        }
      ],
      inviteCode: '123456'
    }
    setInviteCode(result.inviteCode);
    setList(result.friends);
  }

  const handleGoTasks = () => {
    navigate('/tasks');
  };

  const [mCodeOpen, setMCodeOpen] = useState(false)
  const onCloseMCode = () => {
    setMCodeOpen(false)
  }
  const openMCode = () => {
    setMCodeOpen(true)
  }

  const handleClickCopyCode = () => {
    navigator.clipboard.writeText(inviteCode)
  }

  return (
    <div className={style.pgFriends}>
      <div className={style.intro}>
        <div className={style.introImg}></div>
        <div className={style.introTitle}>EARN MORE COINS</div>
        <div className={style.introTxt}>
          <p>Score 5% of your buddies</p>
          <p>+ an extra 1% from their referrals</p>
        </div>
      </div>
      
      <div className={style.pTitle}>
        <div className={style.lnk} onClick={handleGoTasks}>Socials</div>
        <div className={style.currentTab}>
          <div>Friends</div>
          <div className={style.currentSymbol}></div>
        </div>
      </div>
      {
      list.length === 0 ? 
      <div className="nodata">
        <div className="nodata-img"></div>
        <div className="nodata-txt">You haven't invited anyone yet</div>
      </div>
      :
      <div className={style.friends}>
        <div className={style.friendCount}><span>{list.length}</span>Friends</div>
      {list.map((item: any, index) => (
        <div key={index} className={style.friend}>
          <div className={style.avatar}><img src={item.avatar || Default_Avatar} alt="" /></div>
          <div className={style.infoBox}>
            <div className={style.info}>
              <div className={style.name}>{item.name}</div>
              <div className={style.cnt}><div className={style.cntIcon}></div>{item.friendnum}</div>
            </div>
            <div className={style.rewardsInfo}>
              <div className={style.coin}></div>
              <span>+{fmtInt(item.rewards)}</span>
            </div>
          </div>
        </div>
      ))}
      </div>
      }
      {inviteCode &&
      <div className={style.btnInvite} onClick={openMCode}>
        <div className={style.icon}></div>
        <span>INVITE FRIENDS</span>
      </div>
      }
      <Modal
        isOpen={mCodeOpen} onClose={onCloseMCode} overlayClassName={undefined} contentClassName={undefined}>
        <div className="md-title">Your Invitation Code</div>
        <div className={style.myInviteCode}>{inviteCode}<div className={style.copyIcon} onClick={handleClickCopyCode}></div></div>
        <div className={style.inviteTip}>Invite your friends to fill in this code</div>
      </Modal>
    </div>
  );
}
      
export default FriendsPage;