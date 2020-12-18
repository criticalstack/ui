"use strict";

import React from "react";
import h from "../helpers";
import _ from "lodash";
import * as d3 from "d3";

class TempSankey extends React.Component {
  componentDidMount() {
    const defaultHost = ""
    const defaultQuery = "swoll_node_metrics_syscall_count{}"

    const log = console.log.bind(console)

    const linkCurvature = .7;
    const linkPath = (d) => {
      const x0 = d.src.x + d.src.width,
            x1 = d.dst.x,
            xi = d3.interpolateNumber(x0, x1),
            x2 = xi(linkCurvature),
            x3 = xi(1 - linkCurvature),
            y0 = d.src.y + d.startYOffset,
            y1 = d.dst.y + d.endYOffset
      return (`M${x0},${y0}C${x2},${y0}`  +
              ` ${x3},${y1} ${x1},${y1}`  +
              `L${x1},${y1+d.endWidth}`   +
              `C${x3},${y1+d.endWidth}`   +
              ` ${x2},${y0+d.startWidth}` +
              ` ${x0},${y0+d.startWidth}` +
              `L${x0},${y0}`)
    }

    let u = 0
    const makeNode = (n, parent) => {
      n.u = u++
      n.id = n.category + ":" + n.name
      n.parentID = parent ? parent.id : null
      return n
    }

    const nodeIsDragging = (n) => n.dragging || (n.parent && nodeIsDragging(n.parent))
    const linkIsDragging = (l) => _.some([l.src, l.dst], nodeIsDragging)

    const nodeName = (n) => `${n.category}:${n.name}`
    const linkName = (src, dst) => `${nodeName(src)} -> ${nodeName(dst)}`

    const color = d3.scaleOrdinal(d3.schemeTableau10)

    const main = d3.select("#main")
    const input = main.append("input").attr("id", "query").attr("value", defaultQuery)
    input.on("keydown", (e) => {
      if (e.key != "Enter") return;
      queryData(defaultHost, e.target.value)
    })
    const svg = main.append("svg")

    let currentTransform = {k: 1.0, x: 0, y: 0}
    const zoom = d3.zoom().on("zoom", ({transform}) => {
      currentTransform = transform
      mainWrapper.attr("transform", transform)
    }).filter(e => !e.ctrlKey && !e.button && !e.shiftKey)
    svg.call(zoom)

    const updateSelectedClass = () => {
      if (graph.selectedNodes.length == 0) {
        nodeWrapper.selectAll(".selected").classed("selected", false)
        return
      }
      nodeWrapper.selectAll("rect").classed("selected", d => graph.selectedNodes.has(d))
    }

    const updateSelection = () => {
      updateSelectedClass()
      graph.matchedDataIDs = new Set()
      const byLayer = _.values(_.groupBy([...graph.selectedNodes], "layer"))
      if (byLayer.length > 1) {
        graph.data.filter(x => _.every(byLayer, layerNodes => _.some(layerNodes, n => x.metric[n.category] == n.name))).forEach(x => graph.matchedDataIDs.add(x.id))
      }
      pathLabel.text(byLayer.length == 0 ? "" : "selection: "+_.map(byLayer, l => l.length == 1 ? l[0].id : `${l[0].category} (${l.length})`).join(" > "))
      updateLinks()
    }

    const addToSelection = (nodes) => {
      nodes.map(d => graph.selectedNodes.add(d))
      updateSelection()
    }

    const removeFromSelection = (nodes) => {
      nodes.map(d => graph.selectedNodes.delete(d))
      updateSelection()
    }

    const toggleSelected = (d) => {
      graph.selectedNodes.has(d) ? graph.selectedNodes.delete(d) : graph.selectedNodes.add(d)
      updateSelection()
    }

    const clearSelected = () => {
      graph.selectedNodes = new Set()
      updateSelection()
    }

    const mainWrapper = svg.append("g")
    const nodeWrapper = mainWrapper.append("g").attr("id", "nodes")
    const linkWrapper = mainWrapper.append("g").attr("id", "links")
    linkWrapper
      .on("mouseover", (e) => {
        linkWrapper.selectAll("path.hover").classed("hover", false)
        d3.select(e.target)
          .classed("hover", true)
          .raise()
      })
      .on("mouseout", (e) => {
        linkWrapper.selectAll("path.hover").classed("hover", false)
      })
      .on("click", (e) => {
        const l = d3.select(e.target).datum()
        addToSelection([l.src, l.dst])
      })

    const pathLabel = svg.append("text")
      .attr("x", 8)
      .attr("y", 18)
      .text("")

    const helpLabel = svg.append("text")
      .attr("x", 8)
      .attr("y", "99%")
      .attr("fill", "#999")
      .text("shift+click to toggle selection, shift+drag to select multiple, ctrl+shift to clear")
      .on("mouseover", function() { d3.select(this).attr("fill", "#666") })
      .on("mouseout", function() { d3.select(this).attr("fill", "#999") })

    // these are the layers as the user wants to see them
    const userLayers = [
      // ["instance"],
      ["namespace", "pod", "container"],
      ["class", "group", "syscall"],
      ["err"],
    ]

    // these are the computed layer ranks and connections
    const layers = _.fromPairs(_.flatMap(userLayers, (x, i) => x.map(y => [y, i])))
    const linkedCategories = _.flatMap(userLayers.slice(0, userLayers.length-1), (layer, i) => {
      const nextLayer = userLayers[i+1]
       return _.flatMap(layer, l => nextLayer.map(n => [l, n]))
    })

    let mainDragCallback = (e) => {
      let {x, y} = e
      const box = svg.append("rect")
        .attr("fill", "teal")
        .attr("opacity", 0.6)
        .attr("x", x)
        .attr("y", y)
      e.on("drag", (e, d) => {
        box
          .attr("x", Math.min(x, e.x))
          .attr("y", Math.min(y, e.y))
          .attr("width", Math.abs(e.x - x))
          .attr("height", Math.abs(e.y - y))
        let bb = box.node().getBBox()

        bb.x -= currentTransform.x
        bb.y -= currentTransform.y
        nodeWrapper.selectAll("rect").classed("maybe-select", n => {
          let {x, y} = n
          x *= currentTransform.k
          y *= currentTransform.k
          return ((bb.x < x + n.width*currentTransform.k && bb.x + bb.width > x) && (bb.y < y + n.height*currentTransform.k && bb.y + bb.height > y))
        })
      }).on("end", (e, d) => {
        let boi = nodeWrapper.selectAll("rect.maybe-select").classed("maybe-select", false)
        e.sourceEvent.ctrlKey ? removeFromSelection(boi.data()) : addToSelection(boi.data())
        box.remove()
      })
    }
    const mainDrag = d3.drag().on("start", mainDragCallback).filter(e => e.shiftKey && !e.button)
    svg.call(mainDrag)

    const margin = {
      left: 220,
      right: 150,
      top: 50,
    }
    const nodeStartWidth = 80
    const layerSpacing = 700
    const nodePad = 12

    const positionNode = (n, yOffset) => {
      n.incomingLinks = n.outgoingLinks = []
      n.visible = (n.parent ? n.parent.expanded : n.depth == 0)
      let total = (n.parent ? n.parent.height : 200)
      n.x = (n.parent ? n.parent.x + nodePad : margin.left + layers[n.category] * layerSpacing)
      n.y = yOffset
      n.width = Math.max(4, nodeStartWidth - (n.depth * 2 * nodePad))
      n.height = n.part*total + nodePad
      let totalChildHeight = positionNodes(n.y+nodePad, n.children || [])
      if (n.expanded) {
        if (n.children && n.children.length > 0) {
          n.height = totalChildHeight + (n.children.length+1)*nodePad
        }
      }
    }

    const positionNodes = (yOffset, nodes) => {
      return _.sum(nodes.map(n => {
        positionNode(n, yOffset)
        yOffset = n.y + n.height + nodePad
        return n.height
      }))
    }

    let graph = {
      selectedNodes: new Set(),
      matchedDataIDs: new Set(),
      allNodes: [],
      nodeMap: {},
      nodesByCategory: {},
      totalsByCategory: {},
      allLinks: {},
    }

    let nodeEnter = (enter) => {
      let g = enter.append("g").attr("id", d => d.id)
      let rect = g.append("rect")
        .attr("height", d => d.height)
        .attr("width", d => d.width)
        .attr("fill", d => {
          let c = color(d.id)
          if (d.expanded) { c = d3.color(c); c.opacity = 0.5 }
          return c
        })
        .on("mouseover", function() {
          const d = d3.select(this).datum()
          let t = `<b>${d.category}: ${d.name}</b>
    <b>count:</b> <span>${d.value.toLocaleString()} (${(100*d.part).toFixed(1)}%)</span>`
          if (d.children) {
            t += `

    <b>top ${d.children[0].category}s:</b>
    ${_.sortBy(d.children, "value").slice(-5).reverse().map(x => `${x.name} <span>${x.value.toLocaleString()}</span>`).join('\n')}`
          }
          if (d.incomingLinks.length > 0) {
            t += `

    <b>top in:</b>
    ${_.sortBy(d.incomingLinks, "value").slice(-5).reverse().map(x => `${x.src.id} <span>${x.value.toLocaleString()}</span>`).join('\n')}`
          }
          if (d.outgoingLinks.length > 0) {
           t += `

    <b>top out:</b>
    ${_.sortBy(d.outgoingLinks, "value").slice(-5).reverse().map(x => `${x.dst.id} <span>${x.value.toLocaleString()}</span>`).join('\n')}`
          }
          setInspectorText(t)
          showInspector()
          if (inspector.fading) {
            clearTimeout(inspector.fading)
            inspector.fading = null
          }
        })
        .on("mouseout", function() {
          inspector.fading = setTimeout(hideInspector, 1000)
        })
        .on("contextmenu", function (e) {
          const d = d3.select(this).datum()
          log(d)
          updateCtxMenu(e.clientX, e.clientY, [
            {text: "add to selection", fn: () => addToSelection([d])},
            {text: "clear selection", fn: clearSelected},
            {text: "limit query", fn: () => {
              let q = `swoll_node_metrics_syscall_count{${d.category}="${d.name}"}`
              input.attr("value", q)
              queryData(defaultHost, q) 
            }},
          ])
          e.preventDefault()
          let assigned = svg.on("click", () => {
            ctxMenu.g.style("visibility", "hidden")
          })
        })
        .on("click", function (e) {
          const el = d3.select(this)
          const d = graph.nodeMap[el.datum().id]
          if (e.shiftKey) {
            if (e.ctrlKey) clearSelected()
            else toggleSelected(d);
            return
          }
          d.expanded = !(!!d.expanded) // javascript lol
          if (!d.expanded) {
            (d.children || []).map(c => { if (c.expanded) c.expanded = false })
          } else {
            positionNode(d, d.y)
          }
          computeGraph()
        })
      rect.attr("opacity", 0)
        .transition()
        .duration(500)
        .delay(d => d.parent ? 30*_.findIndex(d.parent.children, ["id", d.id]) : 0)
        .attr("opacity", 1)
      return g.call(g =>
        g.attr("transform", d => `translate(${d.x},${d.y})`)
          .filter(d => d.depth == 0)
          .append("text")
            .style("font-size", "10px")
            .attr("x", d => {
              switch (d.layer) {
                case 0: return -nodePad
                case userLayers.length-1: return nodeStartWidth+nodePad
                default: return nodeStartWidth/2
              }
            })
            .attr("y", d => {
              switch (d.layer) {
                case 0: return d.height/2
                case userLayers.length-1: return d.height/2
                default: return -6
              }
            })
            .attr("text-anchor", d => {
              switch (d.layer) {
                case 0: return "end"
                case userLayers.length-1: return "start"
                default: return "middle"
              }
            })
            .attr("dy", "0.35em")
            .text(d => d.name)
            .append("tspan")
              .attr("fill-opacity", 0.7)
              .text(d => ` ${d.value.toLocaleString()}`)
      )
    }

    let nodeUpdate = (update) => {
      return update.call(x => {
        x.transition()
          .duration(500)
          .attr("transform", d => `translate(${d.x},${d.y})`)
        x.select("rect").call(rect => {
          rect
            .attr("width", d => d.width)
            .attr("fill", d => {
              let c = color(d.id)
              if (d.expanded) { c = d3.color(c); c.opacity = 0.5 }
              return c
            })
            .transition().duration(500)
            .attr("height", d => d.height)
          rect.select("title")
            .text(d => `${d.name}\n${d.value.toLocaleString()}`)
        })
        x.select("text")
          .transition()
            .duration(500)
            .attr("y", d => {
              switch (d.layer) {
                case 0: return d.height/2
                case userLayers.length-1: return d.height/2
                default: return -6
              }
            })
        x.select("text tspan").text(d => ` ${d.value.toLocaleString()}`)
      })
    }

    const descendents = (d) => {
      return _.flatMap((d.children || []), c => [c.id].concat(descendents(c)))
    }

    const selfOrParentIsSelected = (d) => {
      return graph.selectedNodes.has(d) || (d.parent && selfOrParentIsSelected(d.parent))
    }

    function computeGraph() {
      _.values(graph.nodesByCategory).map(nodes => positionNodes(margin.top, nodes.filter(n => !n.parent)))
      graph.allNodes = _.sortBy(graph.allNodes, ["layer", "y"])
      _.values(graph.allLinks).forEach(link => {
        link.src = graph.nodeMap[link.source]
        link.dst = graph.nodeMap[link.target]
        
        // don't show links to or from expanded or invisible nodes
        if (link.src.expanded || link.dst.expanded || !(link.src.visible && link.dst.visible)) return;
        link.src.outgoingLinks = (link.src.outgoingLinks || []).concat([link])
        link.dst.incomingLinks = (link.dst.incomingLinks || []).concat([link])
      })
      graph.allNodes.forEach(n => {
        if (!n.visible) return;
        let yOffset = 0;
        n.incomingLinks.map(l => {
          l.endWidth = n.height*(l.value / n.value)
          l.endYOffset = yOffset
          yOffset += l.endWidth
        })
        yOffset = 0;
        n.outgoingLinks.map(l => {
          l.startWidth = n.height*(l.value / n.value)
          l.startYOffset = yOffset
          yOffset += l.startWidth
        })
      })
      nodeWrapper
        .selectAll("g")
        .data(graph.allNodes.filter(d => d.visible), d => d.id)
        .join(nodeEnter, nodeUpdate)
        .call(
          d3.drag()
            .on("start", function (event) {
              const clicked = d3.select(this)
              let childIDs = new Set(descendents(clicked.datum()))
              if (graph.selectedNodes.has(clicked.datum()) && event.sourceEvent.shiftKey) {
                nodeWrapper.selectAll("g").classed("dragging", selfOrParentIsSelected)
              } else {
                clicked.classed("dragging", true)
              }
              nodeWrapper.selectAll("g").filter(d => childIDs.has(d.id)).classed("dragging", true)
              let last = {
                x: event.x,
                y: event.y,
              }

              event.on("drag", (e, d) => {
                nodeWrapper.selectAll(".dragging").each(d => {
                  d.x += e.x - last.x
                  d.y += e.y - last.y
                  d.dragging = true
                }).attr("transform", d => `translate(${d.x},${d.y})`)
                updateLinks()
                last = {x: e.x, y: e.y}
              }).on("end", (e, d) => {
                d.dragging = false
                nodeWrapper.selectAll(".dragging").classed("dragging", false);
              })
            })
        )
      updateLinks()
    }

    const initGraph = (data) => {
      graph.data = data
      graph.allNodes = _.flatMap(graph.data, d => {
        let value = parseInt(d.value[1])
        if (value == 0) return []
        return _.flatMap(userLayers, layer => {
          let prev = null
          return layer.map(category => (prev = makeNode({category, name: d.metric[category], value}, prev)))
        })
      })
      graph.nodeMap = {}
      graph.allNodes = _.map(_.values(_.groupBy(graph.allNodes, "id")), dupes => {
        let first = _.first(dupes)
        if (graph.nodeMap[first.id]) {
          first = graph.nodeMap[first.id]
          first.children = []
        }
        first.value = _.sumBy(dupes, "value")
        return first
      })
      graph.nodeMap = _.keyBy(graph.allNodes, "id")
      graph.nodesByCategory = _.groupBy(graph.allNodes, "category")
      graph.totalsByCategory = _.fromPairs(_.keys(graph.nodesByCategory).map(k => [k, _.sumBy(graph.nodesByCategory[k], "value")]))
      graph.allLinks = {}
      graph.data.forEach((d, i) => {
        d.id = i
        linkedCategories.forEach(([o1, o2]) => {
          let v = parseInt(d.value[1])
          if (v == 0) return;
          let src = { m: d, category: o1, name: d.metric[o1] }
          let dst = { m: d, category: o2, name: d.metric[o2] }
          const name = linkName(src, dst)
          src.label = nodeName(src)
          dst.label = nodeName(dst)
          let link = _.get(graph.allLinks, name, {
            name,
            source: src.label,
            target: dst.label,
            value: 0,
            data: new Set(),
          })
          link.value += v
          link.data.add(d.id)
          graph.allLinks[name] = link
        })
      })

      graph.allNodes.forEach(n => {
        if (n.parentID != null) {
          n.parent = graph.nodeMap[n.parentID]
          n.parent.children = (n.parent.children || []).concat([n])
          n.part = n.value / n.parent.value
          n.depth = n.parent.depth + 1
        } else {
          n.depth = 0
          n.part = n.value / graph.totalsByCategory[n.category]
        }
        n.layer = layers[n.category]
      })

      computeGraph()
    }

    const updateLinks = () => {
      const visibleLinks = _.flatMap(graph.allNodes, d => d.visible ? (d.outgoingLinks || []) : [])
      linkWrapper
        .selectAll("path")
        .data(visibleLinks, d => d.name)
          .join(enter => enter.append("path").attr("opacity", 0))
          .each(function(d) {
            let x = d3.select(this)
            // don't animate transitions if a connected node is dragging
            if (!linkIsDragging(d)) x = x.transition().duration(500)
            x.attr("d", linkPath)
              .attr("opacity", .75)
              .attr("fill", d => {
                return _.some([...d.data], x => graph.matchedDataIDs.has(x)) ? "tomato" : d3.color("#999")
              })
          })
    }

    const inspector = {
      div: main.append("div").attr("id", "inspector"),
      text: "",
    }

    const setInspectorText = (t) => {
      inspector.div.html(inspector.text = t)
    }

    const showInspector = () => {
      inspector.div.style("opacity", ".8")
    }

    const hideInspector = () => {
      inspector.div.style("opacity", "0")
    }

    const ctxMenu = {
      g: svg.append("g").attr("id", "context-menu"),
      lines: [],
      show: false,
      x: 0,
      y: 0,
      lineHeight: 30,
    }

    const updateCtxMenu = (x, y, lines) => {
      ctxMenu.x = x
      ctxMenu.y = y
      ctxMenu.lines = lines
      ctxMenu.g
        .attr("transform", `translate(${x},${y})`)
        .style("visibility", "visible")
      ctxMenu.g.selectAll("g")
        .data(lines)
        .join(
          enter => enter.append("g").call(g => {
            g.append("rect")
              .attr("fill", (_, i) => i % 2 == 0 ? "#444" : "#222")
              .attr("width", 160)
              .attr("height", ctxMenu.lineHeight)
            g.append("text")
              .attr("fill", "#eee")
              .attr("x", 4)
              .attr("y", 4+ctxMenu.lineHeight*.5)
              .text(d => d.text)
            g
              // .on("mouseover", function(e){
              //   d3.select(this).select("rect").attr("fill", (_, i) => i % 2 == 0 ? "#999" : "#333")
              // })
              // .on("mouseout", function(e){
              //   d3.select(this).select("rect").attr("fill", (_, i) => i % 2 == 0 ? "#888" : "#222")
              // })
              .on("click", e => {
                d3.select(e.target).datum().fn()
              })
          }),
          update => update.call(g => {
            g.select("text")
              .text(d => d.text)
            g
              .on("click", e => {
                d3.select(e.target).datum().fn()
              })
          }),
        )
        .attr("transform", (d, i) => `translate(0, ${i * ctxMenu.lineHeight})`)
        .style("cursor", "pointer")
    }


    const queryData = (host=defaultHost, query=defaultQuery) => {
      try {
        (async () => {
          let data = await d3.json(`${host}/api/v1/metrics/query?q=${query}`)
          console.log(data)
          initGraph(data.context.result)
        })()
      } catch (e) {
        console.error(e)
      }
    }

    queryData()
  }

  render() {
    return (<div class="sankey-chart" ref="chart"></div>)
  }
}

export default TempSankey;
