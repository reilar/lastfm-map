import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {getMapData} from './lib'
import {APIProvider} from '@vis.gl/react-google-maps';
import { Chart } from "react-google-charts";
import loader from "./assets/loader.gif";
import './app.css'

const App = () => {
	const googleMapsApiKey = 'API_KEY';
	const defaultData = [['Country', 'Plays']];
	const [data, setData] = useState(defaultData);
	const [loading, setLoading] = useState(false);
	const [userName, setUserName] = useState('');
 
	const handleChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
		setUserName(event.target.value);
	};

	function handleSubmit() {
		if (userName != null && (userName as string).length > 1 && (userName as string).length < 16)
			handleMapData(userName);
		else
			console.log("Enter correct user name.");
	};

	async function handleMapData(userName: string) {
		setLoading(true);
		const mapData = await getMapData(userName);
		setData(mapData);
		setLoading(false);
	}
 
	return (
		<div className="content">
			<div className="userData">
				<input type="text" onChange={ handleChange } defaultValue="Enter Last.fm user name" onFocus={(e) => e.target.value = ""} required />
				<input type="submit" value="GO" onClick={handleSubmit} />
				<img src={loader} className={"loaderImage " + (loading ? 'show' : 'hide')} alt="Loading" />
			</div>
			<APIProvider apiKey={googleMapsApiKey} onLoad={() => console.log('GoogleMaps API has loaded.')}>
				<Chart
				chartEvents={[{
					eventName: "select",
					callback: ({ chartWrapper }) => {
						const chart = chartWrapper!.getChart();
						const selection = chart.getSelection();
						if (selection.length === 0) return;
						const region = data[selection[0].row + 1];
						console.log("Selected: " + region);
					},
				}]}
				chartType="GeoChart"
				loader={<div>Loading map...</div>}
				width="100%"
				height="100%"
				options={{
					displayMode: "regions",
					backgroundColor: "#000",
				}}
				data={data}
				/>
			</APIProvider>
		</div>
	)
};

export default App;
const root = createRoot(document.getElementById('app')!);
root.render(
	<App />
);

