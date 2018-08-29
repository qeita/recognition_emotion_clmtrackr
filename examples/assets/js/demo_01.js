(() => {
  
  /**
   * WebRTCによるカメラアクセス
   */
  const video = document.getElementById('video')
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')
  
  let isVideoRun = true
  let isLoadedMetaData = false
  let constraints = { audio: false, video: {facingMode: 'user'} }

  let ctrack = new clm.tracker()
  ctrack.init()

  delete emotionModel['disgusted']
  delete emotionModel['fear']
  let ec = new emotionClassifier()
  ec.init(emotionModel)
  let emotionData = ec.getBlank()
  const outputItem = document.querySelectorAll('.output_item')
  let emotionObj = {
    angry: {
      rate: 0.1,
      x: 50,
      pos: []
    },
    sad: {
      rate: 0.7,
      x: 100,
      pos: []
    },
    surprised: {
      rate: 0.3,
      x: 150,
      pos: []
    },
    happy: {
      rate: 0.5,
      x: 200,
      pos: []
    },
  }
  let interval = {
    count: 0,
    emotionLimit: 30,
    fallLimit: 120
  }
    
  function start(){
    navigator.mediaDevices.getUserMedia( constraints )
      .then( mediaStrmSuccess )
      .catch( mediaStrmFailed )
  }

  function mediaStrmSuccess( stream ){
    video.srcObject = stream

    // ウェブカムのサイズを取得し、canvasにも適用
    if(isLoadedMetaData) return
    isLoadedMetaData = true

    video.addEventListener('loadedmetadata', () => {
      video.width = video.videoWidth        // clmtrackrのvideo取得にあたりwidth属性に値指定
      video.height = video.videoHeight      // clmtrackrのvideo取得にあたりheight属性に値指定
      canvas.width = video.videoWidth  
      canvas.height = video.videoHeight

      ctrack.start(video)

      requestAnimationFrame( draw )
    }, false)
  }

  function mediaStrmFailed( e ){
    console.log( e )
  }

  function stop(){
    let stream = video.srcObject
    let tracks = stream.getTracks()

    tracks.forEach( (track) => {
      track.stop()
    })
    video.srcObject = null
  }

  function draw(){
    if(isVideoRun){
      detectFace()
    }
    requestAnimationFrame( draw )
  }

  start()


  /**
   * ストリームのコントロール
   */
  const stopBtn = document.getElementById('stop')
  const frontBtn = document.getElementById('front')
  const rearBtn = document.getElementById('rear')

  let ua = navigator.userAgent
  if(ua.indexOf('iPhone') < 0 && ua.indexOf('Android') < 0 && ua.indexOf('Mobile') < 0 && ua.indexOf('iPad') < 0){
    frontBtn.disabled = true
    rearBtn.disabled = true
  }

  stopBtn.addEventListener('click', () => {
    if(isVideoRun){
      stop()
      stopBtn.textContent = 'START'
    }else{
      start()
      stopBtn.textContent = 'STOP'
    }
    isVideoRun = !isVideoRun
  }, false)

  frontBtn.addEventListener('click', () => {
    stop()
    constraints.video.facingMode = 'user'
    setTimeout( () => {
      start()
    }, 500)
  }, false)

  rearBtn.addEventListener('click', () => {
    stop()
    constraints.video.facingMode = 'environment'
    setTimeout( () => {
      start()
    }, 500)
  }, false)


  /**
   * 顔の認識
   */

  function detectFace(){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(video, 0, 0)

    // if( ctrack.getCurrentPosition() ){
    //   ctrack.draw(canvas)
    // }

    if(interval.count === 0){
      for(let k in emotionObj){
        const rate = Math.random()
        if(rate <= emotionObj[k].rate){
          emotionObj[k].pos.push(-40)
        }
      }  
    }
    for(let k in emotionObj){
      for(let i = 0, cnt = emotionObj[k].pos.length; i < cnt; i++){
        emotionObj[k].pos[i]++
        if(emotionObj[k].pos[i] >= canvas.height){
          emotionObj[k].pos.shift()
        }else{
          let img = new Image()
          img.src = `./assets/img/icon_${k}.png`
          ctx.drawImage(img, emotionObj[k].x, emotionObj[k].pos[i])
        }
      }
    }

    if(interval.count % 10 === 0){
      let cp = ctrack.getCurrentParameters()
      let er = ec.meanPredict(cp)
      if(er){
        for(let i = 0; i < er.length; i++){
          if(er[i].value > 0.4){
            console.log(er[i].emotion)
            for(let j = 0; j < outputItem.length; j++){
              if(outputItem[j].getAttribute('data-emotion') === er[i].emotion){
                outputItem[j].classList.add('is-show')
              }else{
                outputItem[j].classList.remove('is-show')
              }
            }
            if(emotionObj[ er[i].emotion ].pos.length > 0){
              emotionObj[ er[i].emotion ].pos.shift()
            }
          }
        }
      }
    }

    interval.count++
    if(interval.count >= interval.fallLimit){
      interval.count = 0
    }
  }



})()