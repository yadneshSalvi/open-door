/** Centimetres; typography uses CLAD's 43.886 units/em calibration.
 * Cap ratio is a conservative system-font estimate, not a hardware measurement.
 */
export const SPATIAL_UI={maxTargets:3,buttonWidth:10.5,buttonHeight:6,gap:2.2,
  rimCm:.24,hoverRimCm:.28,selectedRimCm:.35,rimOpacity:.78,hoverRimOpacity:.9,disabledRimOpacity:.3,disabledLabelOpacity:.5,hoverScale:1.04,pressCm:.35,
  buttonText:58,bodyText:58,captionText:52,textUnitsPerEm:43.886,estimatedCapRatio:.695,
  tagWidth:18,tagHeight:3.2,tagFadeSeconds:.3,leaderCm:2,leaderWidthCm:.08} as const;
export function dockWidth(count:number){return count*SPATIAL_UI.buttonWidth+Math.max(0,count-1)*SPATIAL_UI.gap;}
export function estimatedCapHeight(size:number){return size/SPATIAL_UI.textUnitsPerEm*SPATIAL_UI.estimatedCapRatio;}
export function assertTargetBudget(primary:number,spatial:number){
  if(primary+spatial>SPATIAL_UI.maxTargets)throw new Error('Open Door permits at most three visible UI targets, including object targets.');
}
export function fadeOpacity(current:number,target:number,dt:number){
  const step=Math.max(0,dt)/SPATIAL_UI.tagFadeSeconds;
  return Math.max(0,Math.min(1,current+Math.max(-step,Math.min(step,target-current))));
}
