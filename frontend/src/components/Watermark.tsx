export function Watermark() {
  return (
    <div className="fixed bottom-4 left-4">
      <img
        src="https://michaellambgelo.github.io/img/favicon.png"
        alt=""
        className="w-12 h-12 opacity-70"
        draggable={false}
      />
    </div>
  );
}
