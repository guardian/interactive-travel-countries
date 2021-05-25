import * as d3B from 'd3'
import * as topojson from 'topojson'
import * as geoProjection from 'd3-geo-projection'
import worldMap from 'assets/ne_10m_admin_0_countries_crimea_ukraine_simple.json'
import { numberWithCommas } from 'shared/js/util'
import autoComplete from "@tarekraafat/autocomplete.js";

const d3 = Object.assign({}, d3B, topojson, geoProjection);

const atomEl = d3.select('.interactive-wrapper-map').node()

const isMobile = window.matchMedia('(max-width: 600px)').matches;

let width = atomEl.getBoundingClientRect().width;
let height =  width * 2.5 / 5;

let projection = d3.geoAlbers()
.rotate([-20.0, 0.0]);

let path = d3.geoPath()
.projection(projection);

let extent = {
        type: "LineString",

         coordinates: [
            [0, 70],
            [10, 70],
            [10, 25],
            [0, 25],
        ]
}


projection
.fitExtent([[0, 0], [width, height]], extent);

const filtered = topojson.feature(worldMap, worldMap.objects['world-map-crimea-ukr']).features.filter(f => f.properties.ADMIN != 'Antarctica')

const map = d3.select('.map-container')
.append('svg')
.attr('id', 'travel-map')
.attr('width', width)
.attr('height', height);


const geo = map.append('g')
const smalls = map.append('g')


const tooltip = d3.select('.tooltip-map-list')

const svgY = d3.select(".map-search-box").node().getBoundingClientRect().height;


d3.json('https://interactive.guim.co.uk/docsdata-test/1E0n10TGSGEMSLdOrG0sn7UYnwhO4EIvwC8W4wyff9hA.json')
.then(data => {


	let lights = data.sheets['light-colour-list'];

	lights.map(d => {

		let match = filtered.find(f => f.properties.ISO_A3 === d.code)

		if(match)
			{
				match.status = d.status;
				match.country = d.country
			}
		else console.log(d)
	})


	let ireland = filtered.find(f => f.properties.ISO_A3 === 'IRL')

	ireland.status = 'common';
	ireland.country = 'Ireland';

	geo
	.selectAll('path')
	.data(filtered)
	.enter()
	.append('path')
	.attr('class', d =>  d.properties.ISO_A3 + ' map-' + d.status)
	.attr('id', d =>  d.properties.ADMIN )
	.attr('d', path)
	.attr('fill', '#DADADA')
	.attr('stroke', '#ffffff')
	.attr('stroke-width','1px')
	.attr('stroke-linecap', 'round')
	.on('mouseout' , d => {

		geo.selectAll('path')
		.classed('over', false)

		tooltip.classed('over', false)

	})
	.on('mousemove', (e,d) => manageMove(e,d))
	.attr('size', d => {

		let centroid = path.centroid(filtered.find(f => f.properties.ISO_A3 === d.properties.ISO_A3));

		let w = geo.select('.' + d.properties.ISO_A3).node().getBoundingClientRect().width;

		if(w < 15 && w > 0 && d.status && !isMobile || w < 5 && w > 0 && d.status && isMobile)
		{

			let circle = smalls.append('circle')
			.attr('r', 5)
			.attr('cx', centroid[0] - 2.5)
			.attr('cy',  centroid[1] - 2.5)
			.attr('class', d.properties.ISO_A3 + ' map-' + d.status)
			.attr('id', d.properties.ADMIN)
			.style('stroke-width', '1px')
			.on('mousemove', e => manageMove(e,d))
			.on('mouseout', d => {
				geo.selectAll('path')
				.classed('over', false)
				smalls.selectAll('circle').classed('over', false)
				tooltip.classed('over', false)
			})

		}		

	} )


	map.select('.GBR')
	.attr('pointer-events', 'none')


	let countries = [];

	lights.map(d => {

		if(d.code != '#N/A')countries.push({"country": d.country, "code": d.code})
	})

	let cancel = d3.select('.map-search-box .map-search-cancel')
	.on('click', d => {
		document.querySelector(".map-search-box #map-autoComplete").value = '';
		cancel.style('opacity', 0);

		tooltip.classed('over', false)

		map.selectAll('path')
			.classed('over', false)
	})

	const autoCompleteJs = new autoComplete({
            selector: "#map-autoComplete",
            placeHolder: "Search by country",
            data: {
            	src:countries,
            	key: ["country"]
            },
            resultsList: {
                noResults: (list, query) => {
                    const message = document.createElement("div");
                    message.setAttribute("class", "no_result")
                    message.innerHTML = `<span>Found no results for "${query}"</span>`;
                    list.appendChild(message);
                },
            },
            resultItem: {
                highlight: {
                    render: true
                }
            },
		  searchEngine: "strict",
		  highlight: {
		      render: true,
		  },
		  onSelection: (feedback) => {

		    document.querySelector("#map-autoComplete").value = feedback.selection.value.country;

		    cancel
		    .style('opacity', 1)

		    geo.selectAll('path')
			.classed('over', false)

			smalls.selectAll('circle')
			.classed('over', false)

			let light = lights.find(f => f.code === feedback.selection.value.code)

			let centroid = path.centroid(filtered.find(f => f.properties.ISO_A3 === feedback.selection.value.code));

			tooltip.html(`<span class=map-${light.status}>${feedback.selection.value.country}</span> is on the <span class=c-${light.status}>${light.status}</span> list`)


			let pos = geo.select('.' + feedback.selection.value.code).node().getBBox()

			manageTooltip(pos.x + pos.width, pos.y + pos.height)

			map.selectAll('.' + feedback.selection.value.code)
			.classed('over', true)
			.raise()
		    
		  }	
		});


	if(window.resize)window.resize()
})


const manageTooltip = (posX, posY) => {

	tooltip.classed('over', true)

	let tWidth = +tooltip.node().getBoundingClientRect().width;
	let tHeight = +tooltip.node().getBoundingClientRect().height;

	//if(posX + tWidth > width) posX = width - tWidth;

	tooltip.style('top', posY + svgY + 'px')

	tooltip.style('left', posX - tWidth / 2  + 'px')

	if(posX + (tWidth / 2) > width) tooltip.style('left', width - tWidth  + 'px')



}

const manageMove = (event, d) => {

	smalls.selectAll('circle')
			.classed('over', false)

	map.selectAll('.' + d.properties.ISO_A3)
	.classed('over', true)
	.raise()

	let country = d.country;

	let message = country == 'Ireland' ? `Ireland is part of the common travel area` :`<span class=map-${d.status}>${country}</span> is on the <span class=map-${d.status}>${d.status}</span> list`

	tooltip.html(message)

	tooltip.classed('over', true)

    let left = event.clientX + -atomEl.getBoundingClientRect().left;
    let top = event.clientY + -atomEl.getBoundingClientRect().top;


    let tWidth = tooltip.node().getBoundingClientRect().width;
    let tHeight = tooltip.node().getBoundingClientRect().height;

    let posX = left - tWidth /2;
    let posY = top + 15;

    if(posX + tWidth > width) posX = width - tWidth;
    if(posX < 0) posX = 0;

    tooltip.style('left',  posX + 'px')
    tooltip.style('top', posY + 'px')

}
