// the link to your model provided by Teachable Machine export panel
let holder; // html element to hold iframe
const URL = "https://teachablemachine.withgoogle.com/models/Byp2wB7Ma/";
let model, webcam, ctx, labelContainer, maxPredictions;

let client;

init();

async function init() {
  
    client = mqtt.connect('wss://patch.pral2a.com:8081');

  client.on('error', function(err) {
    console.log(err);
  });

  client.on('connect', function() {
    console.log('I am connected!');
  });
  
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  // load the model and metadata
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  // Convenience function to setup a webcam
  const size = 200;
  const flip = true; // whether to flip the webcam
  webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
  await webcam.setup(); // request access to the webcam
  await webcam.play();
  window.requestAnimationFrame(loop);

  // append/get elements to the DOM
  const canvas = document.getElementById("canvas");
  canvas.width = size;
  canvas.height = size;
  ctx = canvas.getContext("2d");
  labelContainer = document.getElementById("label-container");
  for (let i = 0; i < maxPredictions; i++) { // and class labels
    labelContainer.appendChild(document.createElement("div"));
  }
}
function setup() {
  createCanvas(900, 600);
  canvas.parent('canvas-container');
  background(900);
  // create an iframe
  holder = createElement('iframe');
  // give it the attributes it needs
  // what sort of data, and the link
  holder.attribute('src', 'https://www.youtube.com/embed/YMNZuZe2OCY');
  // HTML element attributes 
  holder.attribute('frameborder', '0');
  // draw it on screen
  holder.position(width / 2 - (holder.width/2), height / 2 - (holder.height/2));

}

async function loop(timestamp) {
  webcam.update(); // update the webcam frame
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  // Prediction #1: run input through posenet
  // estimatePose can take in an image, video or canvas html element
  const {
    pose,
    posenetOutput
  } = await model.estimatePose(webcam.canvas);
  // Prediction 2: run input through teachable machine classification model
  const prediction = await model.predict(posenetOutput);

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ": " + prediction[i].probability.toFixed(3);
    labelContainer.childNodes[i].innerHTML = classPrediction;


  }
  //console.log("/pose");

  if (prediction[0].probability >= 0.90) {
    client.publish("/pose", "left")
    console.log("left!");
    video.style.filter = 'blur(15px)';
  } if (prediction[1].probability >= 0.90) {
    client.publish("/pose", "right")
    console.log("right!");
    video.style.filter = 'blur(15px)';
  } else if (prediction[2].probability >= 0.90) {
    video.style.filter = 'blur(0px)'
    client.publish("/pose", "front")
    console.log("front!");
  }

  // finally draw the poses
  drawPose(pose);
}

function drawPose(pose) {
  if (webcam.canvas) {
    ctx.drawImage(webcam.canvas, 0, 0);
    // draw the keypoints and skeleton
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}