from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
import zipfile


OUT = Path(r"D:\aivoice测试规范(ai协助)\系统倡议汇报PPT.pptx")

SLIDES = [
    {
        "title": "TV AI Voice 测试全流程体系建设倡议",
        "subtitle": "从经验驱动走向标准化、数据化、协同化的质量管理体系",
        "bullets": [
            "适用范围：TV / Projector / STB AI Voice 相关版本测试与问题闭环",
            "汇报目的：说明这项系统倡议的意义、目标、收益与核心优势",
        ],
    },
    {
        "title": "为什么要发起这项系统倡议",
        "bullets": [
            "版本频率提升后，测试范围判断越来越依赖个人经验，标准不一致。",
            "冒烟、语音回归、系统回归缺少统一入口，容易重复劳动，也容易遗漏。",
            "客户问题记录分散，复现、归因、追踪效率低，跨团队沟通成本高。",
            "测试结果沉淀不足，管理层难以快速判断风险与质量趋势。",
        ],
    },
    {
        "title": "这个系统倡议的意义是什么",
        "bullets": [
            "把测试从“人盯人”转成“流程驱动”，让每个版本都有统一的质量入口。",
            "把测试从“感觉判断”转成“数据判断”，通过率、风险、问题分布都可视化。",
            "把问题处理从“被动救火”转成“可追踪闭环”，避免同类问题重复踩坑。",
            "把个人经验沉淀成组织资产，形成语料库、版本记录、问题台账和推荐历史。",
        ],
    },
    {
        "title": "目标是什么",
        "bullets": [
            "统一测试流程：版本接收、影响评估、冒烟测试、专项回归、风险评估、发布结论、归档。",
            "统一记录标准：QA 版本记录、Release Note、客户问题、语音识别记录纳入同一系统。",
            "提升测试效率：减少重复整理、减少遗漏、缩短沟通路径。",
            "提升决策效率：让测试、研发、管理层对风险状态有同一视图。",
            "沉淀长期质量资产：让每次测试和每个问题都能复用。",
        ],
    },
    {
        "title": "系统具体覆盖哪些能力",
        "bullets": [
            "QA 版本记录：记录版本号、模块、风险等级、冒烟/语音/系统回归结果。",
            "Release Note 管理：研发改动统一登记，支撑测试范围评估。",
            "客户问题追踪：问题录入、AI 分类、状态流转、筛选导出。",
            "AI 用例推荐：基于版本改动推荐测试关注点，降低漏测风险。",
            "仪表板：展示通过率、问题分布、风险分布、高风险版本。",
        ],
    },
    {
        "title": "对我们有什么好处",
        "bullets": [
            "对测试团队：流程更清晰、范围更聚焦、结果更可追溯、问题处理更高效。",
            "对研发团队：更快定位问题发生的版本、模块和场景，沟通成本明显下降。",
            "对管理层：可以直接看到版本数量、未解决问题、通过率和高风险分布。",
            "对团队能力：新人更容易上手，经验不再只停留在个人头脑中。",
        ],
    },
    {
        "title": "实施这一举措最大的优势是什么",
        "bullets": [
            "最大的优势：把分散的测试动作整合成一个闭环质量系统。",
            "全链路闭环：从版本输入到测试执行、问题追踪、风险判断、历史沉淀全部打通。",
            "标准化强：每个版本按统一规则执行，结果更可比，过程更可控。",
            "数据化强：不仅知道做了什么，还知道结果如何、风险在哪、趋势怎样。",
            "可扩展性强：后续可继续接入语料库、知识库、自动报表和更强的 AI 辅助能力。",
        ],
    },
    {
        "title": "为什么现在就要做",
        "bullets": [
            "版本越多，越容易遗漏；项目越多，越容易标准不一致。",
            "客户问题越多，追踪和复现成本越高，靠人工记忆不可持续。",
            "历史经验越多，越需要系统化沉淀，否则无法转化为组织能力。",
            "现在建设，不只是提升当前效率，更是在提前控制未来复杂度。",
        ],
    },
    {
        "title": "系统落地后的预期效果",
        "bullets": [
            "版本测试流程统一，执行更稳定。",
            "冒烟测试和语音专项回归标准固定，漏测概率下降。",
            "客户问题处理效率提升，问题归因更快。",
            "高风险版本能被更早识别，管理动作更及时。",
            "测试经验持续沉淀，质量工作从“靠人扛”升级为“靠体系运转”。",
        ],
    },
    {
        "title": "四个问题的简版回答",
        "bullets": [
            "意义：让测试工作从经验驱动转向标准化、数据化、可追踪闭环。",
            "目标：建立覆盖版本、测试、问题、风险和数据沉淀的完整质量保障体系。",
            "好处：测试更高效，研发更好定位，管理更清晰决策，团队更容易沉淀能力。",
            "最大优势：形成一个统一的质量闭环系统，而不是若干分散工具。",
        ],
    },
    {
        "title": "结论与建议",
        "bullets": [
            "这不是一个单纯的记录工具，而是一套面向 AI Voice 场景的质量运营系统。",
            "它解决的不只是“怎么测”，更解决“怎么持续把质量做好”。",
            "建议先以版本记录、客户问题追踪、固定冒烟流程落地，再逐步强化语料库和 AI 推荐能力。",
        ],
    },
]


def xml_text_paragraph(text: str, level: int = 0, size: int = 2200, bold: bool = False) -> str:
    attrs = f' marL="{342900 * (level + 1)}" indent="-171450"' if level > 0 else ""
    b_attr = ' b="1"' if bold else ""
    return (
        f'<a:p><a:pPr lvl="{level}"{attrs}/>'
        f'<a:r><a:rPr lang="zh-CN" sz="{size}"{b_attr} dirty="0" smtClean="0"/>'
        f"<a:t>{escape(text)}</a:t></a:r><a:endParaRPr lang=\"zh-CN\" sz=\"{size}\"/></a:p>"
    )


def slide_xml(title: str, bullets: list[str], subtitle: str | None = None, page_no: int = 1) -> str:
    title_par = xml_text_paragraph(title, size=2800, bold=True)
    body_parts = []
    if subtitle:
        body_parts.append(xml_text_paragraph(subtitle, size=2000))
        body_parts.append("<a:p><a:endParaRPr lang=\"zh-CN\" sz=\"2000\"/></a:p>")
    for bullet in bullets:
        body_parts.append(xml_text_paragraph(bullet, level=0, size=2000))
    body_xml = "".join(body_parts)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
 <p:cSld>
  <p:bg>
   <p:bgPr>
    <a:solidFill><a:srgbClr val="F7FAFC"/></a:solidFill>
   </p:bgPr>
  </p:bg>
  <p:spTree>
   <p:nvGrpSpPr>
    <p:cNvPr id="1" name=""/>
    <p:cNvGrpSpPr/>
    <p:nvPr/>
   </p:nvGrpSpPr>
   <p:grpSpPr>
    <a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm>
   </p:grpSpPr>
   <p:sp>
    <p:nvSpPr><p:cNvPr id="2" name="Top Bar"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr>
     <a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="420000"/></a:xfrm>
     <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
     <a:solidFill><a:srgbClr val="0F62FE"/></a:solidFill>
     <a:ln><a:noFill/></a:ln>
    </p:spPr>
    <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>
   </p:sp>
   <p:sp>
    <p:nvSpPr><p:cNvPr id="3" name="Title"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="685800" y="548640"/><a:ext cx="10363200" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
    <p:txBody><a:bodyPr wrap="square" rtlCol="0" anchor="ctr"/><a:lstStyle/>{title_par}</p:txBody>
   </p:sp>
   <p:sp>
    <p:nvSpPr><p:cNvPr id="4" name="Body"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="822960" y="1645920"/><a:ext cx="10591800" cy="4114800"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
    <p:txBody><a:bodyPr wrap="square" rtlCol="0"/><a:lstStyle/>{body_xml}</p:txBody>
   </p:sp>
   <p:sp>
    <p:nvSpPr><p:cNvPr id="5" name="Footer"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="10058400" y="6172200"/><a:ext cx="1371600" cy="274320"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
    <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>{xml_text_paragraph(str(page_no), size=1400)}</p:txBody>
   </p:sp>
  </p:spTree>
 </p:cSld>
 <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>"""


def presentation_xml(slide_count: int) -> str:
    slide_refs = "".join(
        f'<p:sldId id="{256 + i}" r:id="rId{i + 4}"/>' for i in range(slide_count)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
 saveSubsetFonts="1" autoCompressPictures="0">
 <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
 <p:sldIdLst>{slide_refs}</p:sldIdLst>
 <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
 <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>"""


def content_types_xml(slide_count: int) -> str:
    slide_overrides = "".join(
        f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>'
        for i in range(1, slide_count + 1)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="xml" ContentType="application/xml"/>
 <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
 <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
 <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
 <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
 <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
 <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
 {slide_overrides}
</Types>"""


ROOT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
 <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
 <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""


def presentation_rels_xml(slide_count: int) -> str:
    slide_rels = "".join(
        f'<Relationship Id="rId{i + 4}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i + 1}.xml"/>'
        for i in range(slide_count)
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
 <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
 <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps" Target="viewProps.xml"/>
 {slide_rels}
</Relationships>"""


SLIDE_MASTER = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
 <p:cSld name="Office Theme">
  <p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>
  <p:spTree>
   <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
   <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree>
 </p:cSld>
 <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
 <p:sldLayoutIdLst><p:sldLayoutId id="1" r:id="rId1"/></p:sldLayoutIdLst>
 <p:hf/>
 <p:txStyles>
  <p:titleStyle><a:lvl1pPr algn="l"/></p:titleStyle>
  <p:bodyStyle><a:lvl1pPr algn="l"/></p:bodyStyle>
  <p:otherStyle><a:defPPr/></p:otherStyle>
 </p:txStyles>
</p:sldMaster>"""


SLIDE_MASTER_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
 <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>"""


SLIDE_LAYOUT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
 <p:cSld name="Blank">
  <p:spTree>
   <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
   <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree>
 </p:cSld>
 <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>"""


SLIDE_LAYOUT_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>"""


THEME = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Codex Theme">
 <a:themeElements>
  <a:clrScheme name="Codex">
   <a:dk1><a:srgbClr val="1F2937"/></a:dk1>
   <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
   <a:dk2><a:srgbClr val="111827"/></a:dk2>
   <a:lt2><a:srgbClr val="F3F4F6"/></a:lt2>
   <a:accent1><a:srgbClr val="0F62FE"/></a:accent1>
   <a:accent2><a:srgbClr val="22C55E"/></a:accent2>
   <a:accent3><a:srgbClr val="F59E0B"/></a:accent3>
   <a:accent4><a:srgbClr val="EF4444"/></a:accent4>
   <a:accent5><a:srgbClr val="06B6D4"/></a:accent5>
   <a:accent6><a:srgbClr val="8B5CF6"/></a:accent6>
   <a:hlink><a:srgbClr val="2563EB"/></a:hlink>
   <a:folHlink><a:srgbClr val="7C3AED"/></a:folHlink>
  </a:clrScheme>
  <a:fontScheme name="Codex Fonts">
   <a:majorFont>
    <a:latin typeface="Aptos Display"/>
    <a:ea typeface="Microsoft YaHei"/>
    <a:cs typeface=""/>
   </a:majorFont>
   <a:minorFont>
    <a:latin typeface="Aptos"/>
    <a:ea typeface="Microsoft YaHei"/>
    <a:cs typeface=""/>
   </a:minorFont>
  </a:fontScheme>
  <a:fmtScheme name="Codex Format">
   <a:fillStyleLst>
    <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
    <a:gradFill rotWithShape="1">
     <a:gsLst>
      <a:gs pos="0"><a:schemeClr val="accent1"/></a:gs>
      <a:gs pos="100000"><a:schemeClr val="accent5"/></a:gs>
     </a:gsLst>
     <a:lin ang="5400000" scaled="0"/>
    </a:gradFill>
   </a:fillStyleLst>
   <a:lnStyleLst>
    <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
   </a:lnStyleLst>
   <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
   <a:bgFillStyleLst>
    <a:solidFill><a:schemeClr val="lt1"/></a:solidFill>
    <a:solidFill><a:schemeClr val="lt2"/></a:solidFill>
   </a:bgFillStyleLst>
  </a:fmtScheme>
 </a:themeElements>
</a:theme>"""


PRES_PROPS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>"""


VIEW_PROPS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
 <p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr>
 <p:slideViewPr/>
 <p:outlineViewPr/>
 <p:notesTextViewPr/>
 <p:gridSpacing cx="72008" cy="72008"/>
</p:viewPr>"""


APP_PROPS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
 xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
 <Application>Microsoft Office PowerPoint</Application>
 <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
 <Slides>11</Slides>
 <Notes>0</Notes>
 <HiddenSlides>0</HiddenSlides>
 <MMClips>0</MMClips>
 <ScaleCrop>false</ScaleCrop>
 <HeadingPairs>
  <vt:vector size="2" baseType="variant">
   <vt:variant><vt:lpstr>Slides</vt:lpstr></vt:variant>
   <vt:variant><vt:i4>11</vt:i4></vt:variant>
  </vt:vector>
 </HeadingPairs>
 <TitlesOfParts>
  <vt:vector size="11" baseType="lpstr">
   <vt:lpstr>TV AI Voice 测试全流程体系建设倡议</vt:lpstr>
   <vt:lpstr>为什么要发起这项系统倡议</vt:lpstr>
   <vt:lpstr>这个系统倡议的意义是什么</vt:lpstr>
   <vt:lpstr>目标是什么</vt:lpstr>
   <vt:lpstr>系统具体覆盖哪些能力</vt:lpstr>
   <vt:lpstr>对我们有什么好处</vt:lpstr>
   <vt:lpstr>实施这一举措最大的优势是什么</vt:lpstr>
   <vt:lpstr>为什么现在就要做</vt:lpstr>
   <vt:lpstr>系统落地后的预期效果</vt:lpstr>
   <vt:lpstr>四个问题的简版回答</vt:lpstr>
   <vt:lpstr>结论与建议</vt:lpstr>
  </vt:vector>
 </TitlesOfParts>
 <Company></Company>
 <LinksUpToDate>false</LinksUpToDate>
 <SharedDoc>false</SharedDoc>
 <HyperlinksChanged>false</HyperlinksChanged>
 <AppVersion>16.0000</AppVersion>
</Properties>"""


def core_props_xml() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
 <dc:title>TV AI Voice 测试全流程体系建设倡议</dc:title>
 <dc:subject>系统倡议汇报</dc:subject>
 <dc:creator>Codex</dc:creator>
 <cp:keywords>AI Voice, QA, Test System, PPT</cp:keywords>
 <dc:description>自动生成的系统倡议汇报PPT</dc:description>
 <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
 <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
 <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""


def build_pptx() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml(len(SLIDES)))
        zf.writestr("_rels/.rels", ROOT_RELS)
        zf.writestr("docProps/app.xml", APP_PROPS)
        zf.writestr("docProps/core.xml", core_props_xml())
        zf.writestr("ppt/presentation.xml", presentation_xml(len(SLIDES)))
        zf.writestr("ppt/_rels/presentation.xml.rels", presentation_rels_xml(len(SLIDES)))
        zf.writestr("ppt/presProps.xml", PRES_PROPS)
        zf.writestr("ppt/viewProps.xml", VIEW_PROPS)
        zf.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER)
        zf.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS)
        zf.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT)
        zf.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS)
        zf.writestr("ppt/theme/theme1.xml", THEME)
        for idx, slide in enumerate(SLIDES, start=1):
            zf.writestr(
                f"ppt/slides/slide{idx}.xml",
                slide_xml(slide["title"], slide["bullets"], slide.get("subtitle"), idx),
            )


if __name__ == "__main__":
    build_pptx()
    print(str(OUT))
