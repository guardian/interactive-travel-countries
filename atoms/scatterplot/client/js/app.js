import * as d3B from 'd3'
import autoComplete from "@tarekraafat/autocomplete.js";
import {numberWithCommas} from "shared/js/util.js";

const d3 = Object.assign({}, d3B);


let isMobile = window.matchMedia('(max-width: 700px)').matches;

const atomEl = d3.select('.scatterplot-container').node();

const svgY = d3.select(".light-search-box").node().getBoundingClientRect().height;
const arrowY = d3.select(".gv-arrow-y").node().getBoundingClientRect().height;

let width = atomEl.getBoundingClientRect().width;
let height = isMobile ? window.innerHeight - svgY - (arrowY * 2) - 20 : width * 2.5 / 5;

let svg = d3.select('.scatterplot-container').append("svg")
.attr('class', 'gv-scatterplot-1')
.attr("width", width)
.attr("height", height)

let axis = svg.append('g')
let blobs = svg.append('g')
let highlights = svg.append('g')
let annotations = svg.append('g')

let xScale = d3.scaleLinear()
.range([40, width-40])

let yScale = d3.scaleLog()
.range([height-40, 40])

let radius = d3.scaleSqrt()
.range([5,20])

let xaxis = axis.append("g")
.attr("transform", "translate(0," + (height - 40) + ")")
.attr("class", "xaxis")

let yaxis = axis.append("g")
.attr("class", "yaxis")


let tooltip = d3.select('.tooltip-countries-list');


Promise.all([

		d3.json('https://gdn-cdn.s3.amazonaws.com/2021/jan/covid-scatterplot/data.json'),
		d3.json('https://interactive.guim.co.uk/docsdata/1E0n10TGSGEMSLdOrG0sn7UYnwhO4EIvwC8W4wyff9hA.json')
	])
.then((results) => {

	const data = results[0];

	let irl = data.find(f => f['Country/Region'] == 'Ireland')

	data.splice(data.indexOf(irl),1)

	const lights = results[1].sheets['light-colour-list'];

	data.map(d => d.visitors = 0)

	lights.map(d => {

		let match = data.find(f => {
			if(f.vaxData){
				return f.vaxData.iso_code === d.code
			}
		})

		if(match)
		{
			match.visitors = +d.visitors || 0
			match.status = d.status
			match.notes = d.notes
			match.country = d.country
		}
		else{
			
			//console.log(d)
		}


	})

	data.sort((a,b) => b.visitors - a.visitors)


	let maxCases = d3.max(data, m => +m.fortnightrate);
	let minCases = d3.min(data, m => {
		if(+m.fortnightrate > 0)return +m.fortnightrate
	});
	let maxVaccinations = d3.max(data.map(d => d.vaxData), m => {if(m)return +m.total_vaccinations_per_hundred});
	let maxVisitors = d3.max(lights, d => +d.visitors)

	xScale.domain([0,maxVaccinations])
	yScale.domain([minCases,maxCases])

	radius.domain([1,maxVisitors])

	xaxis
	.call(
	    d3.axisBottom(xScale)
	    .ticks(5)
    )
	.selectAll("text")
	.text(d => d)

	yaxis
	.call(
	    d3.axisLeft(yScale)
	    .ticks(2)
	    .tickSizeInner(-width)
    )
	.selectAll("text")
	.attr('x', 5)
	.attr('y', -10)
	.text(d => (+d * 1000000).toLocaleString('en-GB',{maximumFractionDigits: 0}))

	blobs.selectAll('circle')
	.data(data.filter(d => d.vaxData != undefined))
	.enter()
	.append('circle')
	.attr('id', d => d.vaxData.iso_code)
	.attr('class', d => {
		if(d.status)return 'sc-' + d.status
		else return 'sc-no-match'
	})
	.attr('cx', d => xScale(+d.vaxData.total_vaccinations_per_hundred))
	.attr('cy', d => {
		return yScale(+d.fortnightrate) || yScale(minCases)
	})
	.attr('r', d =>{
		if(d.visitors)return radius(+d.visitors)
		else return 5

	})
	.on('mouseover', (e,d) => {

		highlights.selectAll('circle').remove()

		let posX = xScale(+d.vaxData.total_vaccinations_per_hundred);
		let posY = yScale(+d.fortnightrate) || yScale(minCases);

		let country = d.country;

		let verb;

		country.indexOf('Akrotiri and Dhekelia') != -1 ? verb = 'are' : verb = 'is'

		let message = `<span class=sc-${d.status}>${country}</span> ${verb} on the <span class=sc-${d.status}>${d.status}</span> list`

		d3.select('.tooltip-header')
		.html(message)

		d3.select('.tooltip-cases')
		.html('<b>' + (+d.fortnightrate * 1000000).toLocaleString('en-GB',{maximumFractionDigits: 1}) + '</b> cases per 1m (last fortnight)' )


		let vRate = +d.vaxData.total_vaccinations_per_hundred;

		d3.select('.tooltip-vaccines')
		.style('border-bottom', '2px dotted #b3b3b3')
		.html('<b>' + vRate.toFixed(1) + '</b> doses per 100 people')

		if(d.visitors)
		{
			d3.select('.tooltip-visitors')
			.style('display', 'block')
			.html('<b>' + numberWithCommas((+d.visitors / 1000).toFixed(2)) + 'm</b> UK visitors in 2019')
		}
		else{
			d3.select('.tooltip-visitors')
			.style('display', 'none')

			d3.select('.tooltip-vaccines')
			.style('border-bottom', 0)
		}

		tooltip.classed('over', true);

		let r = 5;

		if(d.visitors)r = radius(+d.visitors)

		manageTooltip(posX, posY, r)

		
	})
	.on('mouseout', d => {
		tooltip.classed('over', false);

		highlights.selectAll('circle').remove()
	})


	blobs.selectAll('.sc-red').raise();
	blobs.selectAll('.sc-green').raise();


	let countries = [];

	lights.map(d => {

		if(d.code != '#N/A')countries.push({"country": d.country, "code": d.code})
	})

	let cancel = d3.select('.light-search-box .search-cancel')
	.on('click', d => {
		document.querySelector(".light-search-box #autoComplete").value = '';

		cancel.style('opacity', 0);

		highlights.selectAll('circle').remove();


		tooltip.classed('over', false)
	})


let annotations = lights.filter( d => d.annotation != '')


annotations.map( d => {

	let match = data.find(f => f.vaxData.iso_code === d.code)


	if(isMobile)
	{
		if(d["mobile render"] === 'TRUE')
		{
			makeAnnotation(xScale(+match.vaxData.total_vaccinations_per_hundred), yScale(+match.fortnightrate), radius(match.visitors),d.annotation, d.orientation)
		}
		
	}
	else
	{
		makeAnnotation(xScale(+match.vaxData.total_vaccinations_per_hundred), yScale(+match.fortnightrate), radius(match.visitors),d.annotation, d.orientation)
	}
})


console.log(annotations)

	const autoCompleteJs = new autoComplete({
            selector: ".light-search-box #autoComplete",
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

		    document.querySelector(".light-search-box #autoComplete").value = feedback.selection.value.country;

		    cancel
		    .style('opacity', 1)

		    let match = data.find(f => {

		    	if(f.vaxData)
		    	{
		    		return f.vaxData.iso_code === feedback.selection.value.code
		    	}
		    })

		    let light = lights.find(f => f.code === feedback.selection.value.code)

		    highlights.selectAll('circle').remove()

		    if(match)
		    {
		    	let posX = xScale(+match.vaxData.total_vaccinations_per_hundred);
			    let posY = yScale(+match.fortnightrate);

			    let verb;

		    	feedback.selection.value.country.indexOf('Akrotiri and Dhekelia') != -1 ? verb = 'are' : verb = 'is'

		    	d3.select('.tooltip-header')
				.html(`<span class=sc-${light.status}>${feedback.selection.value.country}</span> ${verb} on the <span class=sc-${light.status}>${light.status}</span> list`)

				d3.select('.tooltip-cases')
				.html('<b>' + (+match.fortnightrate * 1000000).toLocaleString('en-GB',{maximumFractionDigits: 0}) + '</b> cases per 1m, fortnight' )

				d3.select('.tooltip-vaccines')
				.html('<b>' + match.vaxData.total_vaccinations_per_hundred + '</b> doses per 100 people')

				if(match.visitors)
				{
					d3.select('.tooltip-visitors')
					.html('<b>' + numberWithCommas((+match.visitors / 1000).toFixed(1)) + 'm</b> UK visitors in 2019')
				}
				else{
					d3.select('.tooltip-visitors')
					.html('')
				}

				tooltip.classed('over', true);

				let r = radius(+light.visitors) || 5;

				manageTooltip(posX, posY, r)
		    }
		    else{

		    	tooltip.classed('over', true);

		    	let verb;

		    	feedback.selection.value.country.indexOf('Akrotiri and Dhekelia') != -1 ? verb = 'are' : verb = 'is'

		    	d3.select('.tooltip-header')
				.html(`<span class=sc-${light.status}>${feedback.selection.value.country}</span> ${verb} on the <span class=sc-${light.status}>${light.status}</span> list`)

				d3.select('.tooltip-cases')
				.html('No data available')

				d3.select('.tooltip-vaccines')
				.html('')

				d3.select('.tooltip-visitors')
				.html('')

				tooltip.style('left', 0  + 'px')
				tooltip.style('top', svgY  + 'px')
		    }
			
		  }	
		});




}, (err) => {
    console.log(err)
});


const manageTooltip = (posX, posY, radius = 5, offset = 8) => {

	highlights
	.append('circle')
	.attr('cx', posX)
	.attr('cy', posY)
	.attr('r', radius)
	.attr('stroke', '#333333')
	.attr('stroke-width', '3px')
	.style('fill', 'none')

	let tWidth = +tooltip.node().getBoundingClientRect().width;
	let tHeight = +tooltip.node().getBoundingClientRect().height;

	tooltip.style('top', posY + svgY + arrowY + radius + offset + 'px')

	tooltip.style('left', posX - tWidth / 2 + 'px')

	if(posX + (tWidth / 2) > width) tooltip.style('left', width - tWidth  + 'px')
	if(posX - (tWidth / 2) < 0) tooltip.style('left', 0  + 'px')

	if(posY + tHeight + radius + offset > height){
		tooltip.style('top', posY - tHeight - radius + svgY + arrowY + offset + 'px')
	}


}


const makeAnnotation = (posX, posY, r, text, align = 'left', textWidth = 130, offsetX = 30, offsetY = 15) => {

    if(align === 'left')
    {
        let annBg = annotations
        .append("text")
        .attr("class", "annotationBg")
        .attr("x", d => posX - offsetX - textWidth - r)
        .attr("y", d => posY)
        .text(text)
        .call(wrap, textWidth, 'textBg');

        let ann = annotations
        .append("text")
        .attr("class", "annotation")
        .attr("x", posX - offsetX - textWidth - r )
        .attr("y", posY)
        .text(text)
        .call(wrap, textWidth);


        let line = d3.line()([[posX - r , posY], [ posX - r, posY], [posX - offsetX, posY]])

        annotations
        .append('path')
        .attr('d', line)
        .attr('stroke', '#333333')
        .attr('stroke-width', 1.5)
    }
    else if(align === 'right')
    {
        let annBg = annotations
        .append("text")
        .attr("class", "annotationBg")
        .attr("x",posX + offsetX + 5)
        .attr("y",posY - offsetY)
        .text(text)
        .call(wrap, textWidth, 'textBg');

        let ann = annotations
        .append("text")
        .attr("class", "annotation")
        .attr("x",posX + offsetX + 5 )
        .attr("y",posY - offsetY)
        .text(text)
        .call(wrap, textWidth);

        let line = d3.line()([[posX + r, posY], [ posX + r, posY], [posX + offsetX , posY]])

        annotations
        .append('path')
        .attr('d', line)
        .attr('stroke', '#333333')
        .attr('stroke-width', 1.5)
    }
}

const wrap = (text, width, className = '') => {
    text.each(function () {

        let text = d3.select(this);
        let words = text.text().split(/\s+/).reverse();

        let word;
        let line = [];
        let lineNumber = 0;
        let lineHeight = 1.1; // ems
        let x = text.attr("x");
        let y = text.attr("y");
        let dy = 0;

        let tspan = text.text(null)
        .append("tspan")
        .attr('class', className)
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");

        while (word = words.pop()) {

            line.push(word);

            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                .attr('class', className)
                .attr("x", x)
                .attr("y", y)
                .attr("dy", ++lineNumber * lineHeight + dy + "em")
                .text(word);
            }
        }
    });
}
