/**
 * Created by dee on 2/4/17.
 */

function init(data){
    //console.log(data);
    var temp = JSON.parse(JSON.stringify(data));
    var json = temp;

    var width = 1500,
        height = 800;

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    var force = d3.layout.force()
        .gravity(.05)
        .nodes(json.nodes)
        .links(json.links)
        .size([width, height])
        .linkDistance(450)
        .charge(-100)
        .on("tick",tick)
        .start();

    // build the arrow.
    svg.append("svg:defs").selectAll("marker")
        .data(["end"])      // Different link/path types can be defined here
        .enter().append("svg:marker")    // This section adds in the arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 4)
        .attr("markerHeight", 4)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    // add the links and the arrows
    var path = svg.append("svg:g").selectAll("path")
        .data(force.links())
        .enter().append("svg:path")
        //    .attr("class", function(d) { return "link " + d.type; })
        .attr("class", "link")
        .attr("marker-end", "url(#end)")
        .style("stroke-width", function(d) { return Math.sqrt(d.weight); })
        .style("stroke", function(d) {
            return d.color; });;


    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .on("click", click)
        .on("dblclick", dblclick)
        .call(force.drag);

    node.append("circle")
        .attr("r","6");

    node.append("text")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .text(function(d) {
            if(d.group){ return d.name + ", group" + d.group;}
            else{ return d.name;}
        });

    // add the curvy lines
    function tick() {
        path.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" +
                d.source.x + "," +
                d.source.y + "A" +
                dr + "," + dr + " 0 0,1 " +
                d.target.x + "," +
                d.target.y;
        });

        node
            .attr("transform", function (d) {
                return "translate(" + d.x + "," + d.y + ")";
            });
    }

    // action to take on mouse click
    function click() {
        d3.select(this).select("text").transition()
            .duration(750)
            .attr("x", 22)
            .style("fill", "steelblue")
            .style("stroke", "lightsteelblue")
            .style("stroke-width", ".5px")
            .style("font", "20px sans-serif");
        d3.select(this).select("circle").transition()
            .duration(750)
            .attr("r", 16)
            .style("fill", "lightsteelblue");
    }

    // action to take on mouse double click
    function dblclick() {
        d3.select(this).select("circle").transition()
            .duration(750)
            .attr("r", 6)
            .style("fill", "#ccc");
        d3.select(this).select("text").transition()
            .duration(750)
            .attr("x", 12)
            .style("stroke", "none")
            .style("fill", "black")
            .style("stroke", "none")
            .style("font", "10px sans-serif");
    }

}


function transfer(string){
    var regExp = /[a-z]+/g
    var str = string.replace(regExp, "");
    return parseInt(str, 10);

}

function conversion(json){
    var networkObj = {};
    var links = [];
    var nodes = [];
    var nodeMap = {};
    var i;
    for(i = 0 ; i < json.length ; i++){
        var serverObj = json[i];
        if(serverObj.srcObj && !nodeMap.hasOwnProperty(serverObj.srcObj)){
            nodeMap[serverObj.srcObj] = serverObj.srcObj;
            var nodeObj = {};
            nodeObj.name = serverObj.srcObj;
            if(serverObj.srcType){
                nodeObj.group = transfer(serverObj.srcType);
            }
            nodes[transfer(serverObj.srcObj)-1] = nodeObj;
        }
        if(serverObj.destObj && !nodeMap.hasOwnProperty(serverObj.destObj)){
            nodeMap[serverObj.destObj] = serverObj.destObj;
            var nodeObj = {};
            nodeObj.name = serverObj.destObj;
            if(serverObj.destType){
                nodeObj.group = transfer(serverObj.destType);
            }
            nodes[transfer(serverObj.destObj)-1] = nodeObj;
        }

    }

    for(i = 0 ; i < json.length; i++){
        var serverObj = json[i];

        if(serverObj.srcObj && serverObj.destObj && serverObj.traffic && nodeMap.hasOwnProperty(serverObj.srcObj) && nodeMap.hasOwnProperty(serverObj.destObj)){
            var linkObj = {};
            linkObj.source = transfer(serverObj.srcObj)-1;
            linkObj.target = transfer(serverObj.destObj)-1;
            linkObj.weight = Math.round(serverObj.traffic/1000);
            var num = parseFloat(Math.round((serverObj.packets/serverObj.traffic)*100)/100).toFixed(2);
            if(num <= 0.3){
                linkObj.color = "green";
            }else if(num <= 0.7 && num > 0.3){
                linkObj.color = "yellow";
            }else{
                linkObj.color = "red";
            }
            links.push(linkObj);
        }
    }
    networkObj.nodes = nodes;
    networkObj.links = links;
    return networkObj;
}

function loadData(){
    function DataFetcher(urlFactory, delay) {
        var self = this;

        self.repeat = false;
        self.delay = delay;
        self.timer = null;
        self.requestObj = null;

        function getNext() {
            self.requestObj = $.ajax({
                url: urlFactory()
            }).done(function(response) {
                $(self).trigger("stateFetchingSuccess", {
                    result: response
                });
            }).fail(function(jqXHR, textStatus, errorThrown) {
                $(self).trigger("stateFetchingFailure", {
                    error: textStatus
                });
            }).always(function() {
                if (self.repeat && _.isNumber(self.delay)) {
                    self.timer = setTimeout(getNext, self.delay);
                }
            });
        }

        self.start = function(shouldRepeat) {
            self.repeat = shouldRepeat;
            getNext();
        };

        self.stop = function() {
            self.repeat = false;
            clearTimeout(self.timer);
        };

        self.repeatOnce = function() {
            getNext();
        };

        self.setDelay = function(newDelay) {
            this.delay = newDelay;
        };
    }

    function addNewEntry($container, contentHTML) {
        var $innerSpan = $("<p/>").text(contentHTML),
            $newEntry = $("<li/>").append($innerSpan);

        $container.append($newEntry);
    }

    var $trafficStatusList = $("#mockTrafficStat"),
        df2 = new DataFetcher(function() {
            return "/traffic_status";
        });

    $(df2).on({
        "stateFetchingSuccess": function(event, data) {
            var networkObj = conversion(data.result.data);
            init(networkObj);
        },
        "stateFetchingFailure": function(event, data) {
            addNewEntry($trafficStatusList, JSON.stringify(data.error));
            addNewEntry($trafficStatusList, "Hit a snag. Retry after 1 sec...");
            setTimeout(function() {
                $trafficStatusList.html("");
                df2.repeatOnce();
            }, 1000);
        }
    });

    df2.start();
}


$(function(){
    loadData();

});

