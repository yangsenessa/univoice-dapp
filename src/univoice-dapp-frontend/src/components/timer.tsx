import { useEffect, useState } from 'react';

interface TimerProps {
  start: number;
}

const Timer = ({ start }: TimerProps) => {
  const [time, setTime] = useState(0);
  
  useEffect(() => {
    let interval: number | undefined;
    
    if (start !== 0) {
      setTime(0);
      interval = window.setInterval(() => {
        setTime(new Date().getTime() - start);
      }, 50);
    }
    
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [start]);

  const formatTime = (ms: number) => {
    return ("0" + Math.floor((ms / 60000) % 60)).slice(-2);
  };

  const formatSeconds = (ms: number) => {
    return ("0" + Math.floor((ms / 1000) % 60)).slice(-2);
  };

  const formatMilliseconds = (ms: number) => {
    return ("0" + Math.floor((ms / 10) % 100)).slice(-2);
  };

  return (
    <>
      <span>{formatTime(time)}:</span>
      <span>{formatSeconds(time)}</span>
      <span>.{formatMilliseconds(time)}</span>
    </>
  );
}

export default Timer;