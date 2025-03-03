import { useEffect, useRef, useState } from 'react';
import style from './voice-list-item.module.scss'
import voicePng from '@/assets/imgs/voice.png';
import { getAudioDuration, base64ToBlob } from '@/utils/common'
import _ from 'lodash';

export const VoiceListItem = ({
    item,
    index,
    onDelete,
  }: {
    item: any;
    index: number;
    onDelete: (item: any, index: number) => void;
  }) => {
    const audioRef = useRef<any>();
    // 播放，暂停
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
      if (!item && !item.file_obj) return;
  
      // var urlstr = item.file_obj;
      // var re = /http/gi;
      // var newstr = urlstr.replace(re, "https");
      // console.log('File url:', newstr)

      const blob = base64ToBlob(item.file_obj);
      const url = URL.createObjectURL(blob);
      audioRef.current = new Audio(url);
      // audioRef.current = new Audio(item.file_obj);
      audioRef.current.preload = "metadata";
      audioRef.current.autoplay = false; //true;
      audioRef.current.type = "audio/wav"
  
      if (audioRef.current == null) {
        // console.error('Audio ref error!');
      }
  
      audioRef.current.onloadeddata = () => {
        // console.log('onloadeddata done!!!')
      }
  
      audioRef.current.onload = () => {
        // console.log('onload done!!!')
      }
  
      audioRef.current.onloadstart = () => {
        // console.log('onloadstart done!!!')
      }
  
      audioRef.current.onloadedmetadata = () => {
        // console.log('onloadedmetadata exec!!!')
        const time = audioRef.current.duration;
  
        // console.log('onloadedmetadata time', time);
        time && time !== Infinity && setDuration(time);
      };
  
      audioRef.current.onloadeddata = () => {
        // console.log('onloadeddata exec!!!')
        const time = audioRef.current.duration;
  
        // console.log('onloadeddata time', time);
        time && time !== Infinity && setDuration(time);
      }

      // work in base64
      getAudioDuration(item.file_obj).then(time => {
        time && time !== Infinity && setDuration(time);
      });
  
      return () => {
        audioRef.current = null;
        setPlaying(false);
      };
    }, [item]);
  
    const playAudio = () => {
      audioRef.current.load()
      const audio = audioRef.current;
  
      playing ? audio.pause() : audio.play();
      setPlaying(!playing);
  
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
  
      audio.onended = () => {
        setCurrentTime(duration) // show full
        setPlaying(false);
      };
    };
  
    return (
      <div className={style.voiceItemWrapper}>
        <div className={style.gmt}>
          {new Date(item.gmt_create).toLocaleString()}
        </div>
        <div className={style.voiceItem}>
          <div className={style.voiceImg} onClick={() => playAudio()}>
            <img src={item.icon || voicePng} alt="" />
  
            <div className={style.btnPlay}>
              <div className={`${style.playIcon} ${playing ? style.suspend : style.play}`}></div>
            </div>
          </div>
          <div className={style.progressInfo}>
            <progress
              value={currentTime && duration ? _.round((currentTime / duration) * 100, 2) : 0}
              max="100"
            ></progress>
            <div className={style.duration}>{_.round(duration, 2)}<span className={style.second}>s</span></div>
          </div>
          <div className={style.btnDelete} onClick={() => onDelete(item, index)}></div>
        </div>
      </div>
    );
  };

export default VoiceListItem;

