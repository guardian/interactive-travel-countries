import * as d3B from 'd3'
import { numberWithCommas } from 'shared/js/util'

const d3 = Object.assign({}, d3B, topojson, geoProjection);

const atomEl = d3.select('.interactive-wrapper-red-list').node()

const isMobile = window.matchMedia('(max-width: 600px)').matches;

let width = atomEl.getBoundingClientRect().width;
let height =  width * 2.5 / 5;



d3.json('https://interactive.guim.co.uk/docsdata-test/1E0n10TGSGEMSLdOrG0sn7UYnwhO4EIvwC8W4wyff9hA.json')
.then(data => {
	console.log(data)
})