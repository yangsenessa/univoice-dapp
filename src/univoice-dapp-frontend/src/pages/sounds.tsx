import { useState, useEffect, useCallback } from 'react'
import style from './sounds.module.scss'
import VoiceListItem from '@/components/voice-list-item'
import v from '@/assets/sound1.json'
import { UseScrollToBottom } from '@/components/scroll-to-bottom'
import { showLoading, hideLoading } from '@/components/loading'
import { toastSuccess, toastError } from '@/components/toast'
import { univoice_dapp_backend } from 'declarations/univoice-dapp-backend'

function SoundsPage() {
  const [voicesData, setVoicesData] = useState([])

  const loadMore = useCallback(() => {
    queryVoices(1)
  }, []);

  const containerRef = UseScrollToBottom({
    callback: loadMore,
    offset:50
  });

  useEffect(() => {
    queryVoices(1)
  }, []);

  const onDelete = async (item: any, index: number) => {
    showLoading()
    try {
      // TODO
      const result =  true // univoice_dapp_backend.delVoice(item.prd_id)
      hideLoading()

      toastSuccess('Delete success');
      voicesData.splice(index, 1);
      setVoicesData([...voicesData]);
    } catch (error) {
      console.log('🚀 ~ onDelete ~ error:', error);
      toastError('something wrong, please try again');
    }
  };

  const queryVoices = async (pagenum: number) => {
    const data = [{
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }, {
      prd_id: Math.floor(Math.random() * 100) + 1,
      file_obj: v.data,
      gmt_create: new Date().getTime(),
      icon: ''
    }]
    setVoicesData((prevToasts) => [
      ...prevToasts,
      ...data
    ])
  }

  return (
    <div className={style.pgMyvoice} ref={containerRef}>
      <div className="page-name">My Voices</div>
      {voicesData.length === 0 ? 
      <div className="nodata">
        <div className="nodata-txt">You haven't Voices yet</div>
      </div>
      :
      <div className={style.myvoiceList}>
        {voicesData.map((item, index) => {
          return (
            <VoiceListItem
              item={item}
              key={`item_keys_${index}`}
              index={index}
              onDelete={onDelete}
            />
          );
        })}
      </div>
      }
    </div>
  );
}
  
export default SoundsPage;