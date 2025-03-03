import { useState } from 'react'
import style from './invite-code.module.scss'

const BtnInviteCode = ({
  onClose
}) => {
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = () => {
    // TODO
    onClose();
  }

  const handleInputInviteCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 6) return;
    setInviteCode(e.target.value);
  };

  return (
    <>
      <div className="md-title">Enter Invitation Code</div>
      <div className={style.iptInviteCode}>
        <input
          type="text"
          placeholder="Enter Invitation Code"
          value={inviteCode}
          onChange={handleInputInviteCode}
          // onChange={(e) => setInviteCode(e.target.value)}
        />
      </div>
      <div className={`${style.btnSubmit} btn-1 md-btn-1`} onClick={handleSubmit}>Submit</div>
    </>
  )
}

export default BtnInviteCode;