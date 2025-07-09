# MediaPipe Cat Avatar with Audio-Driven Lip-Syncing

This document describes the implementation of the enhanced cat avatar with MediaPipe face detection and audio-driven lip-syncing for the Voice Chat mode.

## Overview

The enhanced cat avatar feature replaces the previous implementation with a more sophisticated approach that:

1. Uses MediaPipe face detection for more accurate facial feature positioning
2. Implements real-time audio analysis for more realistic lip-syncing
3. Provides enhanced emotion detection with a scoring system
4. Draws expressive eyes and mouth animations based on emotions
5. Includes debug visualization for development and testing

## Components

### 1. MediaPipe Face Detection

The implementation uses TensorFlow.js and MediaPipe's face-landmarks-detection model to detect facial features in the cat image. This provides more accurate positioning of the eyes and mouth compared to the previous manual positioning approach.

```javascript
// Load MediaPipe face detection model
async function loadFaceDetectionModel() {
  await tf.ready();
  faceDetectionModel = await faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
      runtime: 'tfjs',
      refineLandmarks: true,
      maxFaces: 1
    }
  );
}
```

### 2. Audio Analysis for Lip-Syncing

The implementation uses the Web Audio API to analyze the audio being played and extract amplitude data, which drives the mouth animation for more realistic lip-syncing.

```javascript
// Analyze audio and update amplitude
function analyzeAudio() {
  audioAnalyser.getByteFrequencyData(analyserDataArray);
  const sum = analyserDataArray.reduce((acc, val) => acc + val, 0);
  const average = sum / analyserDataArray.length;
  const normalizedAmplitude = average / 255;
  audioAmplitude.set(normalizedAmplitude);
}
```

### 3. Enhanced Emotion Detection

The implementation uses a more sophisticated emotion detection system that scores different emotions based on keyword matches in the text.

```javascript
// Calculate emotion scores based on keyword matches
const scores = {
  happy: (text.match(emotionPatterns.happy) || []).length,
  sad: (text.match(emotionPatterns.sad) || []).length,
  surprised: (text.match(emotionPatterns.surprised) || []).length,
  angry: (text.match(emotionPatterns.angry) || []).length
};
```

### 4. Expressive Facial Animations

The implementation draws expressive eyes and mouth animations based on the current emotion and audio amplitude.

#### Eyes

The eyes are drawn with different styles for different emotions:

- **Happy**: Slightly squinted with upward curve and raised eyebrows
- **Sad**: Droopy with downward angle and lowered eyebrows
- **Surprised**: Wide open with large pupils and raised eyebrows
- **Angry**: Narrowed and angled with furrowed eyebrows
- **Neutral**: Normal proportions with neutral eyebrows

#### Mouth

The mouth is animated based on the audio amplitude and current emotion:

- When speaking, the mouth opens and closes based on the audio amplitude
- When the mouth is open enough, a tongue is drawn
- When not speaking, different closed mouth shapes are drawn for different emotions
- The mouth position and shape are adjusted based on the current emotion

## Implementation Details

### Dependencies

- TensorFlow.js: For running the MediaPipe face detection model
- MediaPipe face-landmarks-detection: For detecting facial features
- Web Audio API: For analyzing audio amplitude

### Files

- `src/lib/shared/components/CatAvatar.svelte`: The cat avatar component with MediaPipe face detection and audio-driven lip-syncing
- `src/lib/modules/chat/voiceServices.js`: Enhanced with audio analysis and improved emotion detection
- `src/lib/modules/chat/components/VoiceChat.svelte`: Integrates the cat avatar with the voice chat functionality

### Key Features

1. **Graceful Fallback**: If MediaPipe face detection fails, the implementation falls back to manual positioning
2. **Real-time Audio Analysis**: The mouth animation is driven by real-time analysis of the audio being played
3. **Expressive Emotions**: The avatar displays different facial expressions based on the emotional content of the AI's responses
4. **Debug Mode**: A debug mode is available for development and testing, which shows bounding boxes and other helpful information

## Usage

To use the enhanced cat avatar in the Voice Chat mode:

1. Ensure the cat image is placed in `static/images/cat/cat.png`
2. The avatar will automatically use MediaPipe for face detection if available
3. The avatar will automatically use audio analysis for lip-syncing
4. The avatar will display different facial expressions based on the emotional content of the AI's responses

### Debug Mode

Debug mode can be enabled by:

1. Setting the `debug` prop to `true` in the `CatAvatar` component
2. Using the keyboard shortcut `Ctrl+Shift+D` in the Voice Chat mode

In debug mode, the avatar will display:

- Bounding boxes for the mouth and eyes
- An audio amplitude indicator
- Text showing the current emotion

## Future Improvements

Potential improvements to the feature include:

1. **More Sophisticated Audio Analysis**: Analyzing frequency patterns for more accurate lip-syncing
2. **More Emotions**: Adding more emotional states beyond the current five
3. **Blinking Animation**: Adding blinking animation for more realism
4. **User-Customizable Avatar**: Allowing users to upload their own avatar images
5. **3D Avatar**: Implementing a 3D avatar using Three.js for more realistic animations
