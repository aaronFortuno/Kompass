// App — Design canvas with 3 variations
function App() {
  return (
    <DesignCanvas>
      <DCSection id="lessons" title="Kompass · millora de lliçons" subtitle="Tres direccions per al mode de lectura d'un tema (A1a-1 · Pronomen). Cada variació porta els 11 steps reals, navegació pas a pas i exercicis pregunta-a-pregunta.">
        <DCArtboard id="focus" label="01 · Focus Mode · editorial refinat" width={1180} height={780}>
          <VariantFocus artboard/>
        </DCArtboard>
        <DCArtboard id="swiss" label="02 · Swiss Grid · minimal tipogràfic" width={1180} height={780}>
          <VariantSwiss artboard/>
        </DCArtboard>
        <DCArtboard id="kartei" label="03 · Kartei · fitxes Bauhaus" width={1180} height={780}>
          <VariantKartei artboard/>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
