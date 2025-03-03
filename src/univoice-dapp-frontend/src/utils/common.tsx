export const blobToBase64 = (blob: Blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // const dataURL = reader.result;
      // const base64 = dataURL.split(',')[1] || dataURL;
      resolve(reader.result);
    }
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
export const base64ToBlob = (base64: string) => {
  const binary = atob(base64.split(',')[1]);
  const array = [];
  for (let i = 0; i < binary.length; i++) {
    array.push(binary.charCodeAt(i));
  }
  return new Blob([new Uint8Array(array)], { type: 'audio/wav' });
}

export const getAudioDuration = (base64String): Promise<number> => {
  return new Promise((resolve, reject) => {
    const byteCharacters = atob(base64String.split(',')[1]);
    const byteArrays = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }
    const arrayBuffer = byteArrays.buffer;
    const audioContext = new (window.AudioContext)();
    audioContext.decodeAudioData(arrayBuffer).then((audioBuffer)=>{
      const duration = audioBuffer.duration;
      audioContext.close();
      resolve(duration);
    });
  });
}

export default blobToBase64;