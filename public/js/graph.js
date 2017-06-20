var width, height;

var svg = d3.select('svg'),
  width = +svg.attr('width'),
  height = +svg.attr('height');

var mainContainer = d3.select('main').node();

var simulation = d3.forceSimulation()
  .force('charge', d3.forceManyBody().strength(-500))
  .force('link', d3.forceLink().id(function(d) { return d._id; }).distance(40))
  .force('x', d3.forceX(width / 2))
  .force('y', d3.forceY(height / 2))
  .on('tick', ticked)
  .stop();

var linkGroups = svg.select('.graph .links').selectAll('.link'),
  nodeGroups = svg.select('.graph .nodes').selectAll('.node');

var groups;  // Array of groups (used to create convex hulls)

var drag = d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);

var nodeScale = d3.scaleSqrt().range([0, 60]);
var linkWidthScale = d3.scaleLinear().range([0, 12]);
var linkArrowScale = d3.scaleLinear().range([0.5, 3]);

function nodeColorScale(c) {
  var colors = {
    'Actor' : '#ffff33',
    'Infrastructure' : '#99cc00',
    'Data': '#3399ff'
  };
  return colors[c] ? colors[c] : '#aaa';
}

var state = {
  hoveredNode: null
};



/* -----------
INITIALISATION
------------*/
function initScales(graph) {
  var nodeMaxValue = d3.max(graph.nodes, function(d) {
    return +d.Scale;
  });
  nodeScale.domain([0, nodeMaxValue]);

  var linkMaxValue = d3.max(graph.links, function(d) {
    return +d.value;
  });
  linkWidthScale.domain([0, linkMaxValue])
  linkArrowScale.domain([0, linkMaxValue])
}


/* ---
EVENTS
--- */
function handleNodeClick(d) {
  d3.select('h1').html(d.Name);
  d3.select('h2').html ('Take me to ' + '<a href="/actors/' + d._id + '" target="_blank">'  + d.Name + ' web page ⇢'+ '</a>' );
}

function handleNodeMouseenter(d) {
  d3.select(this)
    .select('circle')
    .attr('filter', 'url(#drop-shadow)');

  d3.select('#drop-shadow feGaussianBlur')
    .attr('stdDeviation', 4);

  d3.select(this)
    .select('text')
    .style('font-weight', 'bold');
}

function handleNodeMouseleave(d) {
  d3.select(this)
    .select('circle')
    .attr('filter', null)
    .attr('transform', null);

  d3.select('#drop-shadow feGaussianBlur')
    .attr('stdDeviation', 0);

  d3.select(this)
    .select('text')
    .style('font-weight', 'normal');

  state.hoveredNode = null;
  updateTooltip();
}

function handleNodeMousemove(d) {
  state.hoveredNode = d;
  updateTooltip();
}


function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}



/* -----------------
GRAPH INITIALISATION
----------------- */
function constructLink(d) {
  d3.select(this)
    .append('path')
    .classed('curve', true)
    .attr('stroke-width', function(d) { return linkWidthScale(+d.value); });

  // Add a line element to hold the arrow marker. (Couldn't figure out how to get marker-mid working on a quadratic bezier path.)
  d3.select(this)
    .append('line')
    .classed('arrow', true)
    .style('marker-start', 'url(#marker-arrow)')
    .attr('stroke-width', function(d) { return linkArrowScale(+d.value); });
}

function constructNode(d, i) {
  var l = nodeScale(+d.Scale);
  var strokeWidth = 2;

  d3.select(this)
    .append('circle')
    .attr('r', nodeScale(+d.Scale))
    .style('stroke-width', strokeWidth)
    .style('stroke', nodeColorScale(d.Class));

  // Clip mask for image
  d3.select(this)
    .append('defs')
    .append('clipPath')
    .attr('id', 'node-clip-' + i)
    .append('circle')
    .attr('r', nodeScale(+d.Scale) - 0.5 * strokeWidth);

  if(d.image_url !== null) {
    var imageSize = l * 2;
    d3.select(this)
      .append('svg:image')
      .attr('xlink:href', d.image_url)
      .attr('x', -imageSize / 2)
      .attr('y', -imageSize / 2)
      .attr('width', imageSize)
      .attr('height', imageSize)
      .attr('clip-path', 'url(#node-clip-' + i + ')');
  }

  d3.select(this)
    .append('text')
    .attr('class', 'nodetext')
    .attr('y', l + 15)
    .style('font-size', '14px')
    .text(d.Name);

  d3.select(this)
    .on('click', handleNodeClick)
    .on('mouseenter', handleNodeMouseenter)
    .on('mousemove', handleNodeMousemove)
    .on('mouseleave', handleNodeMouseleave);
}

function constructGraph(graph) {
  simulation.nodes(graph.nodes);
  simulation.force('link').links(graph.links);

  linkGroups = linkGroups
    .data(graph.links)
    .enter()
    .append('g')
    .classed('link', true)
    .each(constructLink);

  nodeGroups = nodeGroups
    .data(graph.nodes)
    .enter()
    .append('g')
    .classed('node', true)
    .call(drag)
    .each(constructNode);
}


/* ---
CONVEX HULLS
--- */
function getGroups(graph) {
  // Computes groups array
  var groups = {};
  graph.nodes.forEach(function(d) {

    if(groups[d.Groups] === undefined) {
      groups[d.Groups] = {
        name: d.Groups,
        nodes: []
      };
    }

function handleNodeMousemove(d) {

}

    groups[d.Groups].nodes.push(d);
  });

  // Exclude groups with <3 members
  var filteredGroups = [];
  Object.keys(groups).forEach(function(key) {
    if(groups[key].nodes.length > 2)
      filteredGroups.push(groups[key]);
  });

  return filteredGroups;
}

function updateConvexHulls(groups) {
  groups.forEach(function(group) {
    var points = [];
    group.nodes.forEach(function(node) {
      points.push([node.x, node.y]);
    });
    group.convexHull = d3.polygonHull(points);
  });

  var u = svg.select('.graph .convex-hulls')
    .selectAll('path')
    .data(groups);

  u.enter()
    .append('path')
    .merge(u)
    .attr('d', function(d) { return 'M' + d.convexHull.join('L') + 'Z'; });
}


/* ---
FORCE DIRECTED FUNCTIONS
--- */
function fitToWindow() {
  // A heuristic approach to fitting into the window - if the graph is smaller than the svg element, increase the repulsive force and vice versa
  var padding = 200, strengthDelta = 100;
  var bounds = svg.select('.graph').node().getBBox();
  var currentStrength = simulation.force('charge').strength()();

  var newStr = currentStrength;
  if(bounds.width < width - padding && bounds.height < height - padding)
    newStrength = currentStrength - strengthDelta;
  else if(bounds.width > width + padding || bounds.height > height + padding)
    newStrength = currentStrength + strengthDelta;

  simulation.force('charge').strength(newStrength);
}

function ticked() {
  nodeGroups.attr('transform', function(d) {
	  return 'translate(' + d.x + ',' + d.y + ')';
  });

  linkGroups
    .each(function(d) {
      var p0 = {x: d.source.x, y: d.source.y};
      var p1 = {x: d.target.x, y: d.target.y};
      var mid = quadraticMidpoint(p0, p1);

      var curve = d3.select(this).select('path.curve');

      // Update the curve itself
      curve
        .attr('d', function(d) {
          return 'M' + p0.x + ',' + p0.y + 'Q' + mid.x + ',' + mid.y + ' ' + p1.x + ',' + p1.y;
        });

      // Now update the line element that the arrow marker sits on (couldn't figure out a better way to handle a marker in the middle of a quadratic bezier path)
      var curveMidpoint = getMidpointOfPath(curve.node());
      var arrowOffset = {x: curveMidpoint.x - p0.x, y: curveMidpoint.y - p0.y};
      d3.select(this)
        .select('line.arrow')
        .attr('transform', 'translate(' + arrowOffset.x + ',' + arrowOffset.y + ')')
        .attr('x1', p0.x)
        .attr('y1', p0.y)
        .attr('x2', p1.x)
        .attr('y2', p1.y);
    });

  fitToWindow();
  updateConvexHulls(groups);
}


/* ---
LEGEND
--- */
function initLegend(graph) {
  var classes = [];

  graph.nodes.forEach(function(d) {
    if(classes.indexOf(d.Class) > -1)
      return;

    classes.push(d.Class);
  });

  d3.select('#legend .items')
    .selectAll('.item')
    .data(classes)
    .enter()
    .append('div')
    .classed('item', true)
    .style('color', function(d) {
      return nodeColorScale(d);
    })
    .html(function(d) {
      return '&#9679; ' + d.toUpperCase();
    });
}


/* ----
TOOLTIP
---- */
function updateTooltip() {
  var pos = d3.mouse(mainContainer);
  var offset = 10;

  var d = state.hoveredNode;

  d3.select('#tooltip')
    .style('display', d === null ? 'none' : 'block');

  if(d === null)
    return;

  d3.select('#tooltip .title')
    .text(d.Name);

  var html = '';
  html += '<tr><td>Issue</td><td>' + d.Issue + '</td></tr>';
  html += '<tr><td>Narrative Fragment</td><td>' + d['Narrative fragment'] + '</td></tr>';
  html += '<tr><td>Participant Speech</td><td>' + d['Participant speech'] + '</td></tr>';
  html += '<tr><td>Class</td><td>' + d.Class + '</td></tr>';
  html += '<tr><td>Groups</td><td>' + d.Groups + '</td></tr>';
  html += '<tr><td>Scale</td><td>' + d.Scale + '</td></tr>';
  html += '<tr><td>Posneg</td><td>' + d.Posneg + '</td></tr>';


  d3.select('#tooltip')
    .style('top', (pos[1] + offset) + 'px')
    .style('left', (pos[0] + offset) + 'px')
    .select('table')
    .html(html)


}


//d3.json('data/graph-with-images.json', function(error, graph) {
console.log('DATA URL : ' + dataurl);
d3.json(dataurl, function(error, graph) {
  if (error) throw error;

  initScales(graph);
  initLegend(graph);
  groups = getGroups(graph);
  constructGraph(graph);
  simulation.restart();
});
