from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile


TEMPLATE = Path(r"D:\Desktop\Whale TV PPT Template Simple.pptx")
OUTPUT = Path(r"D:\aivoice测试规范(ai协助)\Whale TV 系统倡议汇报.pptx")

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "ap": "http://schemas.openxmlformats.org/officeDocument/2006/extended-properties",
    "vt": "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes",
}

for prefix, uri in NS.items():
    ET.register_namespace(prefix if prefix not in {"rel", "ct", "ap", "vt"} else "", uri)


CONTENT_SLIDES = [
    {
        "title": "为什么要发起这项系统倡议",
        "items": [
            "版本频率提升后，测试范围判断越来越依赖个人经验。",
            "冒烟、语音回归、系统回归缺少统一标准，容易遗漏。",
            "客户问题记录分散，复现、归因和追踪效率不高。",
            "测试结果沉淀不足，管理层难以快速判断风险。",
            "这项倡议的本质：把分散工作沉淀成可复用、可追踪的系统。",
        ],
    },
    {
        "title": "这个系统倡议的意义是什么",
        "items": [
            "让测试从“人盯人”变成“流程驱动”。",
            "让测试从“感觉判断”变成“数据判断”。",
            "让问题处理从“被动救火”变成“可追踪闭环”。",
            "让团队经验从“个人能力”变成“组织资产”。",
            "最终形成可持续优化的 AI Voice 质量保障体系。",
        ],
    },
    {
        "title": "目标是什么",
        "items": [
            "统一测试流程：版本接收、评估、回归、结论、归档。",
            "统一记录标准：版本记录、Release Note、客户问题统一纳管。",
            "提升测试效率：减少重复劳动和漏测风险。",
            "提升决策效率：让测试、研发、管理层共享同一视图。",
            "沉淀长期资产：每次测试和每个问题都可复用。",
        ],
    },
    {
        "title": "对我们有什么好处",
        "items": [
            "对测试：流程更清晰，范围更聚焦，结果更可追溯。",
            "对研发：更快定位版本、模块和问题场景，沟通成本更低。",
            "对管理：直接看到通过率、高风险版本和未解决问题。",
            "对团队：新人更容易上手，经验不再依赖个别人。",
            "对组织：逐步形成可复制、可扩展的质量运营能力。",
        ],
    },
    {
        "title": "实施这一举措最大的优势是什么",
        "items": [
            "最大的优势：把分散的测试动作整合成一个闭环质量系统。",
            "全链路闭环：从版本输入到风险判断、历史沉淀全部打通。",
            "标准化强：每个版本按统一规则执行，过程更可控。",
            "数据化强：不仅记录做了什么，还能看到结果和趋势。",
            "可扩展性强：后续可继续强化语料库、知识库、自动报表和 AI 能力。",
        ],
    },
]


def qn(tag: str) -> str:
    prefix, local = tag.split(":")
    return f"{{{NS[prefix]}}}{local}"


def set_text_body(shape: ET.Element, text: str) -> None:
    tx_body = shape.find("p:txBody", NS)
    if tx_body is None:
        tx_body = ET.SubElement(shape, qn("p:txBody"))
        ET.SubElement(tx_body, qn("a:bodyPr"))
        ET.SubElement(tx_body, qn("a:lstStyle"))
    else:
        for child in list(tx_body):
            tx_body.remove(child)
        ET.SubElement(tx_body, qn("a:bodyPr"))
        ET.SubElement(tx_body, qn("a:lstStyle"))

    p = ET.SubElement(tx_body, qn("a:p"))
    ET.SubElement(p, qn("a:pPr"), {"lvl": "0"})
    r = ET.SubElement(p, qn("a:r"))
    ET.SubElement(r, qn("a:rPr"), {"lang": "zh-CN", "dirty": "0"})
    ET.SubElement(r, qn("a:t")).text = text
    ET.SubElement(p, qn("a:endParaRPr"), {"lang": "zh-CN", "dirty": "0"})


def make_text_shape(shape_id: int, name: str, x: int, y: int, cx: int, cy: int, text: str, font_size: int, color: str = "bg1", bold: bool = False, italic: bool = False, align: str = "l") -> ET.Element:
    sp = ET.Element(qn("p:sp"))
    nv = ET.SubElement(sp, qn("p:nvSpPr"))
    ET.SubElement(nv, qn("p:cNvPr"), {"id": str(shape_id), "name": name})
    ET.SubElement(nv, qn("p:cNvSpPr"), {"txBox": "1"})
    ET.SubElement(nv, qn("p:nvPr"))

    sp_pr = ET.SubElement(sp, qn("p:spPr"))
    xfrm = ET.SubElement(sp_pr, qn("a:xfrm"))
    ET.SubElement(xfrm, qn("a:off"), {"x": str(x), "y": str(y)})
    ET.SubElement(xfrm, qn("a:ext"), {"cx": str(cx), "cy": str(cy)})
    ET.SubElement(sp_pr, qn("a:prstGeom"), {"prst": "rect"})
    ET.SubElement(sp_pr.find("a:prstGeom", NS), qn("a:avLst"))
    ET.SubElement(sp_pr, qn("a:noFill"))

    tx_body = ET.SubElement(sp, qn("p:txBody"))
    ET.SubElement(tx_body, qn("a:bodyPr"), {"wrap": "square", "rtlCol": "0"})
    ET.SubElement(tx_body, qn("a:lstStyle"))
    p = ET.SubElement(tx_body, qn("a:p"))
    ET.SubElement(p, qn("a:pPr"), {"algn": align})
    r = ET.SubElement(p, qn("a:r"))
    rpr_attrs = {"lang": "zh-CN", "sz": str(font_size), "dirty": "0"}
    if bold:
        rpr_attrs["b"] = "1"
    if italic:
        rpr_attrs["i"] = "1"
    rpr = ET.SubElement(r, qn("a:rPr"), rpr_attrs)
    solid = ET.SubElement(rpr, qn("a:solidFill"))
    ET.SubElement(solid, qn("a:schemeClr"), {"val": color})
    ET.SubElement(r, qn("a:t")).text = text
    end = ET.SubElement(p, qn("a:endParaRPr"), {"lang": "zh-CN", "sz": str(font_size)})
    solid2 = ET.SubElement(end, qn("a:solidFill"))
    ET.SubElement(solid2, qn("a:schemeClr"), {"val": color})
    return sp


def build_cover_slide(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    sp_tree = root.find("p:cSld/p:spTree", NS)
    if sp_tree is None:
        return xml_bytes

    sp_tree.append(make_text_shape(20, "Cover Title", 860000, 1700000, 5100000, 1300000, "TV AI Voice\n测试全流程体系建设倡议", 2600, bold=True))
    sp_tree.append(make_text_shape(21, "Cover Subtitle", 960000, 3200000, 4700000, 900000, "从经验驱动走向标准化、数据化、协同化的质量管理体系", 1400, italic=True))
    sp_tree.append(make_text_shape(22, "Cover Footer", 960000, 4050000, 4200000, 500000, "系统倡议汇报", 1200))
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build_content_slide(base_xml: bytes, title: str, items: list[str]) -> bytes:
    root = ET.fromstring(base_xml)
    shapes = root.findall("p:cSld/p:spTree/p:sp", NS)
    texts = [title] + items[:8]
    for i, shape in enumerate(shapes):
        if i < len(texts):
            set_text_body(shape, texts[i])
        else:
            set_text_body(shape, "")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build_end_slide(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    sp_tree = root.find("p:cSld/p:spTree", NS)
    if sp_tree is None:
        return xml_bytes
    sp_tree.append(make_text_shape(30, "End Title", 3000000, 2860000, 6200000, 700000, "谢谢", 3400, color="bg1", bold=True, align="ctr"))
    sp_tree.append(make_text_shape(31, "End Subtitle", 3120000, 3710000, 5950000, 550000, "Q&A", 2000, color="bg1", align="ctr"))
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_presentation_xml(xml_bytes: bytes, slide_count: int) -> bytes:
    root = ET.fromstring(xml_bytes)
    sld_id_lst = root.find("p:sldIdLst", NS)
    if sld_id_lst is None:
        return xml_bytes
    for child in list(sld_id_lst):
        sld_id_lst.remove(child)

    order = [1, 2, 4, 5, 6, 3]
    rel_ids = {1: "rId6", 2: "rId7", 3: "rId8", 4: "rId15", 5: "rId16", 6: "rId17"}
    for idx, slide_no in enumerate(order):
        ET.SubElement(
            sld_id_lst,
            qn("p:sldId"),
            {"id": str(256 + idx), qn("r:id"): rel_ids[slide_no]},
        )
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_presentation_rels(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    existing = {rel.attrib["Id"] for rel in root.findall("rel:Relationship", NS)}
    additions = [
        ("rId15", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide", "slides/slide4.xml"),
        ("rId16", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide", "slides/slide5.xml"),
        ("rId17", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide", "slides/slide6.xml"),
    ]
    for rid, rtype, target in additions:
        if rid not in existing:
            ET.SubElement(root, qn("rel:Relationship"), {"Id": rid, "Type": rtype, "Target": target})
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_content_types(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    existing = {ov.attrib.get("PartName") for ov in root.findall("ct:Override", NS)}
    for slide_no in [4, 5, 6]:
        part = f"/ppt/slides/slide{slide_no}.xml"
        if part not in existing:
            ET.SubElement(
                root,
                qn("ct:Override"),
                {
                    "PartName": part,
                    "ContentType": "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
                },
            )
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def update_app_props(xml_bytes: bytes) -> bytes:
    root = ET.fromstring(xml_bytes)
    slides = root.find("ap:Slides", NS)
    if slides is not None:
        slides.text = "6"

    heading_pairs = root.find("ap:HeadingPairs/vt:vector", NS)
    if heading_pairs is not None and len(list(heading_pairs)) >= 2:
        heading_pairs[1][0].text = "6"

    titles = root.find("ap:TitlesOfParts/vt:vector", NS)
    titles_list = [
        "TV AI Voice 测试全流程体系建设倡议",
        "为什么要发起这项系统倡议",
        "这个系统倡议的意义是什么",
        "目标是什么",
        "对我们有什么好处",
        "实施这一举措最大的优势是什么",
    ]
    if titles is not None:
        for child in list(titles):
            titles.remove(child)
        titles.attrib["size"] = str(len(titles_list))
        for t in titles_list:
            el = ET.SubElement(titles, qn("vt:lpstr"))
            el.text = t
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def build() -> None:
    with zipfile.ZipFile(TEMPLATE, "r") as zin:
        files = {name: zin.read(name) for name in zin.namelist()}

    files["ppt/slides/slide1.xml"] = build_cover_slide(files["ppt/slides/slide1.xml"])
    files["ppt/slides/slide2.xml"] = build_content_slide(files["ppt/slides/slide2.xml"], CONTENT_SLIDES[0]["title"], CONTENT_SLIDES[0]["items"])
    files["ppt/slides/slide4.xml"] = build_content_slide(files["ppt/slides/slide2.xml"], CONTENT_SLIDES[1]["title"], CONTENT_SLIDES[1]["items"])
    files["ppt/slides/slide5.xml"] = build_content_slide(files["ppt/slides/slide2.xml"], CONTENT_SLIDES[2]["title"], CONTENT_SLIDES[2]["items"])
    files["ppt/slides/slide6.xml"] = build_content_slide(files["ppt/slides/slide2.xml"], CONTENT_SLIDES[3]["title"], CONTENT_SLIDES[3]["items"])
    files["ppt/slides/slide3.xml"] = build_end_slide(files["ppt/slides/slide3.xml"])

    files["ppt/slides/_rels/slide4.xml.rels"] = files["ppt/slides/_rels/slide2.xml.rels"]
    files["ppt/slides/_rels/slide5.xml.rels"] = files["ppt/slides/_rels/slide2.xml.rels"]
    files["ppt/slides/_rels/slide6.xml.rels"] = files["ppt/slides/_rels/slide2.xml.rels"]
    files["ppt/slides/_rels/slide3.xml.rels"] = (
        b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        b'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        b'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout18.xml"/>'
        b"</Relationships>"
    )

    files["ppt/presentation.xml"] = update_presentation_xml(files["ppt/presentation.xml"], 6)
    files["ppt/_rels/presentation.xml.rels"] = update_presentation_rels(files["ppt/_rels/presentation.xml.rels"])
    files["[Content_Types].xml"] = update_content_types(files["[Content_Types].xml"])
    files["docProps/app.xml"] = update_app_props(files["docProps/app.xml"])

    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for name, data in files.items():
            zout.writestr(name, data)


if __name__ == "__main__":
    build()
    print(str(OUTPUT))
