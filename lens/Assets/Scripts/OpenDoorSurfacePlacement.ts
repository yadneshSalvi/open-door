/** Horizontal Preview-surface hit; does not measure room or table extents. */
export class OpenDoorSurfacePlacement {
  private session:HitTestSession|null=null;
  private serial=0;
  private requestedAt=0;
  public status='idle';
  public candidate:vec3|null=null;
  public normal:vec3|null=null;
  public confirmed=false;
  public request(camera:Transform) {
    const serial=++this.serial;this.candidate=null;this.normal=null;this.confirmed=false;
    this.status='querying';this.requestedAt=getTime();
    try {
      const worldQuery=require('LensStudio:WorldQueryModule') as WorldQueryModule;
      if(!this.session){const options=HitTestSessionOptions.create();options.filter=true;this.session=worldQuery.createHitTestSessionWithOptions(options);}
      this.session.start();
      const start=camera.getWorldPosition(),end=start.add(camera.forward.uniformScale(-500));
      this.session.hitTest(start,end,hit=>{
        if(serial!==this.serial)return;
        if(!hit){this.status='no_surface';return;}
        const normal=hit.normal.normalize(),distance=start.distance(hit.position);
        if(!Number.isFinite(distance)||normal.y<.95){this.status='not_horizontal';return;}
        if(distance<35||distance>250){this.status='move_closer';return;}
        this.candidate=new vec3(hit.position.x,hit.position.y,hit.position.z);
        this.normal=new vec3(normal.x,normal.y,normal.z);this.status='ready';
      });
    }catch(error){this.status='unavailable';print('OPEN_DOOR_SURFACE '+String(error));}
  }
  public update(){if(this.status==='querying'&&getTime()-this.requestedAt>4){this.serial++;this.status='timeout';}}
  public confirm():vec3|null {
    if(this.status!=='ready'||!this.candidate)return null;
    const point=this.candidate;this.confirmed=true;this.status='confirmed';this.serial++;this.session?.stop();return point;
  }
  public stop(){this.serial++;this.session?.stop();if(this.status!=='confirmed')this.status='idle';}
}
