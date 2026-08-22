import {useMemo, useState} from 'react';
import {Chart} from 'react-google-charts';
import {getMapData} from './lib';
import loader from './assets/loader.gif';
import './app.css';

const defaultData: (string | number)[][] = [['Country', 'Plays']];

const App = () => {
	const [data, setData] = useState<(string | number)[][]>(defaultData);
	const [loading, setLoading] = useState(false);
	const [userName, setUserName] = useState('');
	const [statusMessage, setStatusMessage] = useState('Enter a Last.fm username to load top countries.');
	const [statusTone, setStatusTone] = useState<'idle' | 'error' | 'success'>('idle');

	const chartData = useMemo(() => {
		if (data.length <= 1) {
			return [['Country', 'Plays']];
		}
		return data;
	}, [data]);

	const countryCount = useMemo(() => {
		if (data.length <= 1) {
			return 0;
		}
		return data.length - 1;
	}, [data]);

	const totalPlays = useMemo(() => {
		if (data.length <= 1) {
			return 0;
		}
		return data.slice(1).reduce((sum, row) => {
			const plays = Number(row[1] ?? 0);
			return sum + plays;
		}, 0);
	}, [data]);

	const countryNames = useMemo(() => {
		if (data.length <= 1) {
			return [];
		}
		return data.slice(1).map((row) => String(row[0] ?? 'Unknown'));
	}, [data]);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setUserName(event.target.value);
		if (statusTone !== 'idle') {
			setStatusMessage('Enter a Last.fm username to view top countries.');
			setStatusTone('idle');
		}
	};

	const handleSubmit = async () => {
		const trimmedUserName = userName.trim();
		if (trimmedUserName.length <= 1 || trimmedUserName.length >= 16) {
			setStatusMessage('Please enter a Last.fm username between 2 and 15 characters.');
			setStatusTone('error');
			setData(defaultData);
			return;
		}

		await handleMapData(trimmedUserName);
	};

	async function handleMapData(targetUserName: string) {
		setLoading(true);
		setStatusMessage('Loading top countries from Last.fm…');
		setStatusTone('idle');

		try {
			const mapData = await getMapData(targetUserName);
			if (mapData.length <= 1) {
				setStatusMessage('No country data was found for that user yet.');
				setStatusTone('error');
				setData(defaultData);
				return;
			}

			setStatusMessage(`Fetched ${mapData.length - 1} countries for ${targetUserName}.`);
			setStatusTone('success');
			setData(mapData);
		} catch (error) {
			console.error('Failed to load map data:', error);
			const errorMessage = error instanceof Error ? error.message : 'Something went wrong while fetching the map data.';
			setStatusMessage(errorMessage.includes('403') ? 'No access. Verify the API keys and try again.' : errorMessage);
			setStatusTone('error');
			setData(defaultData);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="content">
			<div className="userData">
				<div className="inputRow">
					<input
						type="text"
						value={userName}
						placeholder="Name"
						onChange={handleChange}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								void handleSubmit();
							}
						}}
						required
						disabled={loading}
					/>
					<button type="button" onClick={() => void handleSubmit()} disabled={loading}>
						{loading ? 'Loading…' : 'GO'}
					</button>
				</div>
				<div className={`statusMessage ${statusTone}`} aria-live="polite">
					{statusMessage}
				</div>
				<img src={loader} className={'loaderImage ' + (loading ? 'show' : 'hide')} alt="Loading" />
			</div>

			{chartData.length > 1 && (
				<div className="mapSummaryBar" aria-live="polite">
					<div className="summaryItem">
						<span className="summaryLabel">Countries</span>
						<strong>{countryCount}</strong>
					</div>
					<div className="summaryItem">
						<span className="summaryLabel">Total plays</span>
						<strong>{totalPlays.toLocaleString()}</strong>
					</div>
					<div className="countryListBlock">
						<span className="summaryLabel">Country list</span>
						<ul className="countryList">
							{countryNames.map((country) => (
								<li key={country}>{country}</li>
							))}
						</ul>
					</div>
					<div className="legend" aria-label="Map color legend">
						<span className="legendLabel">Legend</span>
						<div className="legendScale">
							<span className="legendSwatch swatchLow" />
							<span className="legendSwatch swatchMid" />
							<span className="legendSwatch swatchHigh" />
						</div>
						<div className="legendText">
							<span>Low</span>
							<span>Mid</span>
							<span>High</span>
						</div>
					</div>
				</div>
			)}

			{chartData.length <= 1 ? (
					<div className="mapEmptyState">Map data will appear here.</div>
				) : (
					<Chart
						chartEvents={[{
							eventName: 'select',
							callback: ({chartWrapper}) => {
								const chart = chartWrapper?.getChart();
								const selection = chart?.getSelection() ?? [];
								if (selection.length === 0) return;
								const region = data[selection[0].row + 1];
								if (region) {
									console.log('Selected: ' + region.join(' - '));
								}
							},
						}]}
						chartType="GeoChart"
						loader={<div>Loading map...</div>}
						width="100%"
						height="100%"
						options={{
							displayMode: 'regions',
							backgroundColor: '#000',
							legend: 'none',
							colorAxis: {colors: ['#dfe7ff', '#7a6cff', '#0d4dff']},
						}}
						data={chartData}
					/>
				)}
		</div>
	);
};

export default App;
