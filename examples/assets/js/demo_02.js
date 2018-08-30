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


  /**
   * 顔・表情認識
   */
  let stats = new Stats()
  let ctrack = new clm.tracker()
  ctrack.init()

  delete emotionModel['disgusted']
  delete emotionModel['fear']
  let ec = new emotionClassifier()
  ec.init(emotionModel)
  let emotionData = ec.getBlank()
  const startBtn = document.getElementById('start_btn')
  const scoreTxt = document.querySelector('.score_txt')
  const outputItem = document.querySelectorAll('.output_item')

  // 落下する表情アイテム
  let emotionObj = {
    angry: {
      rate: 0.1,
      x: 0,
      pos: [],
      score: 50
    },
    sad: {
      rate: 0.7,
      x: 0,
      pos: [],
      score: 50
    },
    surprised: {
      rate: 0.3,
      x: 0,
      pos: [],
      score: 50
    },
    happy: {
      rate: 0.5,
      x: 0,
      pos: [],
      score: 50
    },
  }
  let interval = {
    count: 0,
    emotionLimit: 30,
    fallLimit: 120
  }
  let score = 0
  let isGameStart = false
  window.AudioContext = window.AudioContext || window.webkitAudioContext
  let audioContext = new AudioContext()
  let buffer = null
  let source = audioContext.createBufferSource()
  let request = new XMLHttpRequest()

  stats.showPanel( 0 )
  document.body.appendChild(stats.dom)

  request.open('GET', './assets/audio/CIM_City.mp3', true)
  request.responseType = 'arraybuffer'
  request.send()


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

      let n = 0
      for(let k in emotionObj){
        emotionObj[k].x = canvas.width/2 + 50 * (n - 2)
        console.log(emotionObj[k].x)
        n++
      }

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
    stats.begin()
    if(isVideoRun){
      detectFace()
    }
    stats.end()
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
   * 表情の認識
   */
  scoreTxt.textContent = score

  request.onload = () => {
    let res = request.response
    audioContext.decodeAudioData(res, (buf) => {
      buffer = buf
    })

    startBtn.addEventListener('click', () => {

      isGameStart = true
      startBtn.classList.remove('is-show')
      score = 0
      scoreTxt.textContent = score

      if(!source){
        source = audioContext.createBufferSource()
      }
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start(0)

      source.onended = () => {
        isGameStart = false
        startBtn.classList.add('is-show')
  
        source.onended = null
        source.stop(0)
        source = null
  
        for(let k in emotionObj){
          emotionObj[k].pos = []
        }  
        console.log('finish')
      }

    }, false)  
  }

  function detectFace(){
    ctx.globalAlpha = 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(video, 0, 0)

    if(!isGameStart) return

    // 生成
    if(interval.count === 0){
      for(let k in emotionObj){
        const rate = Math.random()
        if(rate <= emotionObj[k].rate){
          emotionObj[k].pos.push(-40)
        }
      }  
    }
    // 描画
    for(let k in emotionObj){
      for(let i = 0, cnt = emotionObj[k].pos.length; i < cnt; i++){
        emotionObj[k].pos[i] += 2
        if(emotionObj[k].pos[i] >= canvas.height){
          emotionObj[k].pos.shift()
        }else{
          let img = new Image()
          img.src = `./assets/img/icon_${k}.png`
          ctx.globalAlpha = 0.6
          ctx.drawImage(img, emotionObj[k].x, emotionObj[k].pos[i])
        }
      }
    }

    if(interval.count % 10 === 0){
      let cp = ctrack.getCurrentParameters()
      let er = ec.meanPredict(cp)
      let isReactive = false

      if(er){
        for(let i = 0; i < er.length; i++){
          if(er[i].value > 0.4){
            isReactive = true
            console.log(er[i].emotion)
            for(let j = 0; j < outputItem.length; j++){
              if(outputItem[j].getAttribute('data-emotion') === er[i].emotion){
                outputItem[j].classList.add('is-show')
              }else{
                outputItem[j].classList.remove('is-show')
              }
            }
            if(emotionObj[ er[i].emotion ].pos.length > 0){
              // 削除
              emotionObj[ er[i].emotion ].pos.shift()
              score += emotionObj[ er[i].emotion ].score
              scoreTxt.textContent = score
            }
          }
        }
      }

      if(!isReactive){
        for(let j = 0; j < outputItem.length; j++){
          outputItem[j].classList.remove('is-show')
        }
      }

    }

    interval.count++
    if(interval.count >= interval.fallLimit){
      interval.count = 0
    }
  }



})()