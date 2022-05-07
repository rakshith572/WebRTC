let APP_ID="8d55d11946f944c79dbdac22e441fcf9";


let queryString=window.location.search;
let urlParams=new URLSearchParams(queryString);
let roomId=urlParams.get('room');

if(!roomId){
    window.location='room.html'
}

let token = null;
let uid=String(Math.floor(Math.random()*10000));
let client;
let channel;

let localStream;
let remoteStream;
let peerConnection;

const servers = {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}
let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}

const init=async ()=>{
    client=await AgoraRTM.createInstance(APP_ID);
    await client.login({uid,token});

    channel=client.createChannel(roomId);
    await channel.join();
 

    channel.on('MemberJoined',handleUserJoined);

    client.on(`MessageFromPeer`,handleMessageFromPeer);

    channel.on('MemberLeft',handelUserLeft);

    localStream = await navigator.mediaDevices.getUserMedia(constraints);

    document.getElementById('user-1').srcObject=localStream;
}

let handelUserLeft=(MemberId)=>{
    document.getElementById('user-2').style.display='none';
    
    document.getElementById('user-1').classList.remove('smallFrame');
}
let handleUserJoined=(MemberId)=>{
    console.log(`a user joined with id ${MemberId}`);
    createOffer(MemberId);
}

let handleMessageFromPeer=(message,MemberId)=>{
    message=JSON.parse(message.text);
    // console.log('message',message);
    if(message.type=='offer'){
        // console.log(message);
        createAnswer(MemberId,message.offer);
    }

    if(message.type=='answer'){
        addAnswer(message.answer);
    }

    if(message.type=='candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate);
        }
    }
}

const createPeerConnection=async (MemberId)=>{
    peerConnection=new RTCPeerConnection(servers);
    remoteStream=new MediaStream();
    document.getElementById('user-2').srcObject=remoteStream;
    document.getElementById('user-2').style.display='block';
    document.getElementById('user-1').classList.add('smallFrame');

    if(!localStream){
        localStream=await navigator.mediaDevices.getUserMedia({
            video:true,
            audio:true
        });
        document.getElementById('user-1').srcObject=localStream;
    }

    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track,localStream);
    });

    peerConnection.ontrack=(event)=>{
        event.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track);
        });
    }

    peerConnection.onicecandidate=async (event)=>{
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})},MemberId);
        }
    }
}
const createOffer=async (MemberId)=>{
    
    await createPeerConnection(MemberId);

    let offer= await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer','offer':offer})},MemberId);
}

let createAnswer = async (MemberId, offer) => {

    await createPeerConnection(MemberId)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    client.sendMessageToPeer({text:JSON.stringify({'type':'answer', 'answer':answer})}, MemberId)
}

const addAnswer=async (answer)=>{
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer);
    }
}

let leaveChannel=async()=>{
    await channel.leave();
    await client.logout();
}

let toggleCamera=async()=>{
    let videoTrack=localStream.getTracks().find((track)=>track.kind==='video');
    
    if(videoTrack.enabled){
        videoTrack.enabled=false;
        document.getElementById('camera').style.backgroundColor='rgb(255,80,80)';
    }else{
        videoTrack.enabled=true;
        document.getElementById('camera').style.backgroundColor='rgb(179, 102, 249, .9)';
    }
}

let toggleMic=async()=>{
    let audioTrack=localStream.getTracks().find((track)=>track.kind==='audio');
    
    if(audioTrack.enabled){
        audioTrack.enabled=false;
        document.getElementById('mic').style.backgroundColor='rgb(255,80,80)';
    }else{
        audioTrack.enabled=true;
        document.getElementById('mic').style.backgroundColor='rgb(179, 102, 249, .9)';
    }
}

document.getElementById('camera').addEventListener('click',toggleCamera);
document.getElementById('mic').addEventListener('click',toggleMic);
window.addEventListener('beforeunload',leaveChannel)

init();