type AudioCue='clear'|'contact'|'roll';

/** Stable native stream per track; the shared source follows the physical event. */
export class OpenDoorAudio {
  private source:SceneObject;
  private voices:Partial<Record<AudioCue,AudioComponent>>={};
  private active:AudioCue|null=null;
  public lastCue='none';
  public cuesPlayed=0;
  /** Constructed by the experience's OnStart, after scene inputs are available. */
  constructor(parent:SceneObject,clear?:AudioTrackAsset,contact?:AudioTrackAsset,roll?:AudioTrackAsset) {
    this.source=global.scene.createSceneObject('Open Door · spatial feedback');this.source.setParent(parent);
    const tracks:Partial<Record<AudioCue,AudioTrackAsset>>={clear,contact,roll};
    for(const cue of ['clear','contact','roll'] as AudioCue[]) {
      const track=tracks[cue];if(!track)continue;
      const audio=this.source.createComponent('Component.AudioComponent');
      audio.enabled=true;audio.playbackMode=Audio.PlaybackMode.LowLatency;
      // Match UIKitAudioPlayer's stable per-track voice pattern. Reassigning a
      // live audioTrack can replace its native stream during stop/play.
      audio.audioTrack=track;
      audio.volume=cue==='roll'?.18:.38;audio.fadeInTime=.015;audio.fadeOutTime=.05;
      audio.spatialAudio.enabled=true;audio.spatialAudio.positionEffect.enabled=true;
      audio.spatialAudio.distanceEffect.enabled=true;
      audio.spatialAudio.distanceEffect.minDistance=35;audio.spatialAudio.distanceEffect.maxDistance=700;
      audio.mixToSnap=true;this.voices[cue]=audio;
    }
  }
  public play(cue:AudioCue,position:vec3) {
    if(this.active!==cue)this.stop();
    this.source.getTransform().setWorldPosition(position);
    const audio=this.voices[cue];if(!audio)return;
    audio.position=0;audio.play(cue==='roll'?-1:1);
    this.active=cue;this.lastCue=cue;this.cuesPlayed++;
  }
  public follow(position:vec3){if(this.active==='roll')this.source.getTransform().setWorldPosition(position);}
  public stop(){const audio=this.active&&this.voices[this.active];if(audio?.isPlaying())audio.stop(false);this.active=null;}
  public available(){return {clear:Boolean(this.voices.clear),contact:Boolean(this.voices.contact),roll:Boolean(this.voices.roll)};}
}
