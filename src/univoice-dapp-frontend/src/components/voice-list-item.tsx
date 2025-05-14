import { useEffect, useRef, useState } from 'react';
import style from './voice-list-item.module.scss'
import voicePng from '@/assets/imgs/voice.png';
import { getAudioDuration, base64ToBlob } from '@/utils/common'
import _ from 'lodash';

interface VoiceItem {
  file_obj: string;
  icon?: string;
  gmt_create?: number;
  created_at?: number;
}

// Helper function to safely format dates
const formatDate = (timestamp: any) => {
  console.log('🚀 ~ formatDate ~ timestamp:', timestamp);
  if (timestamp === null || timestamp === undefined) return 'No date';
  
  // Handle extra large timestamps (nanoseconds or microseconds)
  let adjustedTimestamp = timestamp;
  if (timestamp.toString().length > 13) {
    // Convert nanoseconds (10^-9) or microseconds (10^-6) to milliseconds (10^-3)
    adjustedTimestamp = Math.floor(timestamp / 1000000);
  }
  
  const date = new Date(adjustedTimestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return 'No date';
  }
  
  // Format as yyyy-mm-dd, hr:mi:se
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}, ${hours}:${minutes}:${seconds}`;
};

export const VoiceListItem = ({
    item,
    index,
    onDelete,
  }: {
    item: VoiceItem;
    index: number;
    onDelete: (item: VoiceItem, index: number) => void;
  }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
      if (!item?.file_obj) return;
  
      const blob = base64ToBlob(item.file_obj);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.preload = "metadata";
      audio.autoplay = false;
  
      audio.onloadedmetadata = () => {
        const time = audio.duration;
        time && time !== Infinity && setDuration(time);
      };
  
      audio.onloadeddata = () => {
        const time = audio.duration;
        time && time !== Infinity && setDuration(time);
      }

      getAudioDuration(item.file_obj).then(time => {
        time && time !== Infinity && setDuration(time);
      });
  
      return () => {
        if (audio) {
          audio.pause();
          audioRef.current = null;
        }
        URL.revokeObjectURL(url);
        setPlaying(false);
      };
    }, [item.file_obj]);

    const playAudio = () => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.load();
      if (playing) {
        audio.pause();
      } else {
        audio.play();
      }
      setPlaying(!playing);
  
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };
  
      audio.onended = () => {
        setCurrentTime(duration);
        setPlaying(false);
      };
    };
  
    return (
      <div className={style.voiceItemWrapper}>
        <div className={style.gmt}>
          {formatDate(item.gmt_create || item.created_at)}
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

