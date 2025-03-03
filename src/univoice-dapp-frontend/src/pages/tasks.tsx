import { useEffect, useState } from 'react';
import style from './tasks.module.scss'
import TaskItem from '@/components/task-item';
import { useNavigate } from 'react-router-dom';
import IconX from '@/assets/svg/logo_twitter.svg'
import IconTG from '@/assets/svg/logo_telegram.svg'
import IconYTB from '@/assets/svg/logo_YouTuBe.svg'

function TasksPage() {
  const navigate = useNavigate();
  
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

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    const result = {
      add_tasks: [{
        task_id: 'Follow X',
        task_url: 'https://x.com/UNIVOICE_',
        status: '', //'FINISH',
        // logo: 'logo',
        // icon: 'icon',
        // task_desc: 'desc',
        rewards: 5000
      }, {
        task_id: 'Follow TG Community',
        task_url: 'https://t.me/univoiceofficial',
        status: '', //'FINISH',
        // logo: 'logo',
        // icon: 'icon',
        // task_desc: 'desc',
        rewards: 5000
      }, {
        task_id: 'Follow TG Channel',
        task_url: '',
        status: '', //'FINISH',
        // logo: 'logo',
        // icon: 'icon',
        // task_desc: 'desc',
        rewards: 5000
      }, {
        task_id: 'Follow YouTuBe',
        task_url: '',
        status: '', //'FINISH',
        // logo: 'logo',
        // icon: 'icon',
        // task_desc: 'desc',
        rewards: 5000
      }]
    }
    if (result?.add_tasks) {
      const newList = result?.add_tasks.map((item: any, idx: number) => {
        return {
          ...initList[idx],
          ...item,
        };
      });

      setTasks(newList || []);
      return;
    }

    setTasks([]);
  }

  const handleGoFriends = () => {
    navigate('/friends');
  };

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