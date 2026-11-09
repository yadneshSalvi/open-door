/** A horizontal surface hit on either platform; it never measures furniture or room extents. */
export class OpenDoorSurfacePlacement {
  private session:HitTestSession|null=null;
  private sessionRunning=false;
  private serial=0;
  private requestedAt=0;
  private nextProbeAt=0;
  private active=false;
  private pending=false;
  private intent:'table'|'floor'='table';
  public requests=0;
  public aim:vec3|null=null;
  public status='idle';
  public candidate:vec3|null=null;
  public normal:vec3|null=null;
  public confirmed=false;
  public request(camera:Transform,intent:'table'|'floor'='table') {
    if(intent!==this.intent){this.candidate=null;this.normal=null;}this.intent=intent;
    this.active=true;
    const serial=++this.serial;this.confirmed=false;this.pending=true;
    if(!this.candidate)this.status='querying';this.requestedAt=getTime();this.nextProbeAt=this.requestedAt+.5;this.requests++;
    const start=camera.getWorldPosition(),forward=camera.forward.uniformScale(-1).normalize(),target=start.add(forward.uniformScale(intent==='floor'?150:75));
    this.aim=new vec3(target.x,target.y,target.z);
    try {
      const worldQuery=require('LensStudio:WorldQueryModule') as WorldQueryModule;
      if(!this.session)this.session=worldQuery.createHitTestSession();
      // Keep depth acquisition warm across probes. Restarting the session for
      // every ray can continuously reset its acquisition/filter history.
      if(!this.sessionRunning){this.session.start();this.sessionRunning=true;}
      // Query the actual pitched gaze. A flattened aim can hit the back wall
      // before the tabletop the wearer is looking at.
      const end=start.add(forward.uniformScale(intent==='floor'?350:150));
      this.session.hitTest(start,end,hit=>{
        if(serial!==this.serial)return;
        this.pending=false;
        if(!hit){this.candidate=null;this.normal=null;this.status='no_surface';return;}
        const normal=hit.normal.normalize(),distance=start.distance(hit.position);
        if(!Number.isFinite(distance)||normal.y<.95){this.candidate=null;this.normal=null;this.status='not_horizontal';return;}
        if(distance<35||distance>(intent==='floor'?350:150)){this.candidate=null;this.normal=null;this.status='move_closer';return;}
        this.candidate=new vec3(hit.position.x,hit.position.y,hit.position.z);
        this.normal=new vec3(normal.x,normal.y,normal.z);this.status='ready';
      });
    }catch(error){this.pending=false;this.candidate=null;this.normal=null;this.status='unavailable';print('OPEN_DOOR_SURFACE '+String(error));}
  }
  public update(camera?:Transform|null){
    if(this.pending&&getTime()-this.requestedAt>4){this.serial++;this.pending=false;this.candidate=null;this.status='timeout';}
    // Two queries per second; never stack requests while a prior callback is pending.
    if(this.active&&camera&&!this.pending&&getTime()>=this.nextProbeAt)this.request(camera,this.intent);
  }
  public confirm():vec3|null {
    if(this.status!=='ready'||!this.candidate)return null;
    const point=this.candidate;this.confirmed=true;this.active=false;this.pending=false;this.status='confirmed';this.serial++;this.stopSession();return point;
  }
  private stopSession(){if(this.sessionRunning){this.session?.stop();this.sessionRunning=false;}}
  public stop(){this.active=false;this.pending=false;this.serial++;this.stopSession();this.candidate=null;this.normal=null;this.aim=null;this.status='idle';}
}
