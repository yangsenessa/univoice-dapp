import React, { useEffect, useState } from 'react';
import style from './tasks.module.scss'
import TaskItem from '@/components/task-item';
import { useNavigate } from 'react-router-dom';
import IconX from '@/assets/svg/logo_twitter.svg'
import IconTG from '@/assets/svg/logo_telegram.svg'
import IconYTB from '@/assets/svg/logo_YouTuBe.svg'
import { get_user_tasks } from '@/utils/callbackend';
import { WALLET_TYPE } from '@/utils/uv_const'
import { useAcountStore } from '@/stores/user'

function TasksPage() {
  const navigate = useNavigate();
  const { getPrincipal, setUserByWallet } = useAcountStore();

  const initList = [
    {
      icon: IconX,
      task_desc: 'Follow Our Twitter',
      isComplete: false,
    }, {
      icon: IconTG,
      task_desc: 'Jion Our TG Community',
      isComplete: false,
    }, {
      icon: IconTG,
      task_desc: 'Jion Our TG Channel',
      isComplete: false,
    }, {
      icon: IconYTB,
      task_desc: 'Follow Our YouTuBe',
      isComplete: false,
    },
  ];

  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const principal_id = async () => {
    const principalId = getPrincipal();

    if (!principalId) {
      try {
        const { reConnectPlug, getPlugPrincipal } = await import('@/utils/icplug');
        await reConnectPlug();
        const newPrincipalId = await getPlugPrincipal();

        if (newPrincipalId) {
          setUserByWallet(WALLET_TYPE.PLUG, newPrincipalId);
          return newPrincipalId;
        }
      } catch (error) {
        console.error("Failed to reconnect to plug wallet:", error);
      }
      return '';
    }

    return principalId;
  }

  const initData = async () => {
    try {
      const principalId = await principal_id();
      if (!principalId) {
        console.error("No principal ID available");
        setTasks(initList);
        return;
      }

      const userTasks = await get_user_tasks(principalId);

      if (userTasks && userTasks.length > 0) {
        const newList = userTasks.map((item: any, idx: number) => {
          const uiData = idx < initList.length ? initList[idx] : {};
          return {
            ...uiData,
            ...item,
          };
        });

        setTasks(newList);
      } else {
        const defaultList = initList.map((item, idx) => {
          return {
            ...item,
            task_id: ['Follow_X', 'Follow_TG_Community', 'Follow_TG_Channel', 'Follow_YouTuBe'][idx] || '',
            task_url: [
              'https://x.com/UNIVOICE_',
              'https://t.me/univoiceofficial',
              'https://t.me/+S3WQWidjW9lkZTU1',
              ''
            ][idx] || '',
            status: '',
            rewards: 5000
          };
        });

        setTasks(defaultList);
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    initData();
  }, []);

  const handleGoFriends = () => {
    navigate('/friends');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={style.pgTasks}>
      <div className={style.intro}>
        <div className={style.introImg}></div>
        <div className={style.introTitle}>EARN MORE COINS</div>
        <div className={style.introTxt}>
          <p>Score 5% of your buddies</p>
          <p>+ an extra 1% from their referrals</p>
        </div>
      </div>

      <div className={style.pTitle}>
        <div className={style.currentTab}>
          <div>Socials</div>
          <div className={style.currentSymbol}></div>
        </div>
        <div className={style.lnk} onClick={handleGoFriends}>Friends</div>
      </div>
      <div>
        {tasks.map((item: any, index) => {
          return (
            <TaskItem
              hideAction={false}
              customeClass={'customeClass'}
              customeIconClass={'customeIconClass'}
              item={item}
              key={`item_keys_${index}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default TasksPage;