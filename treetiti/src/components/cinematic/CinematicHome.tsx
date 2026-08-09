import Scene01_Arrival from "../scenes/Scene01_Arrival"
import UGCSection from "../UGCSection"
import Scene03_AIWebsites from "../scenes/Scene03_AIWebsites"
import Scene04_Automation from "../scenes/Scene04_Automation"
import Scene05_Branding from "../scenes/Scene05_Branding"
import Scene07_Pipeline from "../scenes/Scene07_Pipeline"
import Scene08_Workflow from "../scenes/Scene08_Workflow"
import Scene10_FinalCTA from "../scenes/Scene10_FinalCTA"

export default function CinematicHome() {
  return (
    <div className="relative" style={{ background: "var(--bg)" }}>
      <div id="hero"><Scene01_Arrival /></div>
      <div id="services"><UGCSection /></div>
      <div id="ai-content"><Scene03_AIWebsites /></div>
      <div id="automation"><Scene04_Automation /></div>
      <div id="branding"><Scene05_Branding /></div>
      <div id="pipeline"><Scene07_Pipeline /></div>
      <div id="workflow"><Scene08_Workflow /></div>
      <div id="cta"><Scene10_FinalCTA /></div>
    </div>
  )
}
