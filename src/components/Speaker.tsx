import speakerPhoto from '@/assets/deveesh.png';

export function Speaker() {
  return (
    <div className="absolute bottom-8 left-8 flex items-center gap-4">
      <img src={speakerPhoto} alt="" className="size-14 rounded-full object-cover" />
      <div className="text-left leading-tight">
        <p className="text-xl font-extrabold text-ink">Deveesh Shetty</p>
        <p className="text-base font-semibold text-sub">Software Engineer @ Levels.fyi</p>
      </div>
    </div>
  );
}
