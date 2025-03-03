import { useState } from 'react'
import style from './record-voice.module.scss'
import Timer from '@/components/timer'
import { useReactMediaRecorder } from "react-media-recorder-2";
import { blobToBase64 } from '@/utils/common'
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const RecordVoice = ({
  onClose
}) => {
    const [isPressing, setPressing] = useState(false);
    let timer = null;
    const [recordTimer, setRecordTimer] = useState(0)
    
    const [dotLottie, setDotLottie] = useState(null);
    const dotLottieRefCallback = (dotLottie) => {
      setDotLottie(dotLottie);
    };

    const handleMouseDown = () => {
      timer = setTimeout(() => {
        setPressing(true);
        startRecord();
      }, 600);
    };
    
    const handleMouseUp = () => {
      clearTimeout(timer);
      if (isPressing) {
        setPressing(false);
        stopRecord();
      }
    };

    const startRecord = () => {
      console.log('start record')
      startRecording()
      setRecordTimer(new Date().getTime())
      dotLottie.play()
    }
    const stopRecord = () => {
      console.log('end record')
      stopRecording()
      setRecordTimer(0)
      dotLottie.stop();
    }

    const doUploadVoice = async (mediaBlobUrl: string, blob: Blob) =>{
      console.log("Fetch blob success:" + mediaBlobUrl);
      if(blob != null || blob !=undefined) {
        console.log("Blob voice is not null", blob);
        await blobToBase64(blob).then((base64) => {
          console.log("Base64 voice is:", base64);
          // TODO
        });
      }
    }

    const {
      status,
      startRecording,
      stopRecording,
      mediaBlobUrl,
    } = useReactMediaRecorder({ 
      audio: true,
      blobPropertyBag: {
        type: "audio/wav",
      },
      onStop: doUploadVoice
    });

  return (
    <div className={style.recordPanel}>
      <div className={style.timer}>
        <Timer start={recordTimer} />
      </div>
      <div className={style.btnAnimate}>
        <DotLottieReact
          src='/recordvoice.lottie'
          loop
          // autoplay
          dotLottieRefCallback={dotLottieRefCallback}
        />
      </div>
      <div className={style.btnRecord}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onMouseLeave={handleMouseUp}></div>
      <div className={style.tip}>Press and hold to record your exclusive voice.</div>
    </div>
  );
}

export default RecordVoice;