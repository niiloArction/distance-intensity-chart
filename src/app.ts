import { lightningChart, AxisTickStrategies, emptyLine, emptyFill, SolidLine, AxisScrollStrategies, AreaSeriesTypes, AutoCursorModes, IntensitySeriesTypes, SolidFill, ColorRGBA, PalettedFill, LUT } from "@arction/lcjs"
import { createWhiteNoiseGenerator } from "@arction/xydata"


const CONFIG = {
    timeDomain: 20,
    waterfallSampleSize: 8,
}

const dashboard = lightningChart().Dashboard({
    numberOfColumns: 1,
    numberOfRows: 2,
    disableAnimations: true,
})

const distanceIntensityChart = dashboard.createChartXY({
    columnIndex: 0,
    rowIndex: 0,
})

const waterfallChart = dashboard.createChartXY({
    columnIndex: 0,
    rowIndex: 1,
})

// Style charts to get "shared X Axis look"
distanceIntensityChart.setPadding({ bottom: 2 }).setTitle('Distance intensity + waterfall chart')
const distanceIntensityAxisX = distanceIntensityChart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.Empty).setStrokeStyle(emptyLine)
const distanceIntensityAxisY = distanceIntensityChart.getDefaultAxisY().setTickStrategy(AxisTickStrategies.Empty)
waterfallChart.setPadding({ top: 2 }).setTitleFillStyle(emptyFill)
waterfallChart.getDefaultAxisY().setTickStrategy(AxisTickStrategies.Empty)
dashboard
    .setSplitterStyle((line: SolidLine) => line.setThickness(1))
    .setRowHeight(0, 2)
    .setRowHeight(1, 5)

// Setup chart series, axes.
distanceIntensityChart.getDefaultAxisX().setInterval(-CONFIG.timeDomain, 0).setScrollStrategy(AxisScrollStrategies.progressive)
const distanceIntensitySeries = distanceIntensityChart.addAreaSeries({ type: AreaSeriesTypes.Positive }).add({ x: 0, y: 0 })
// NOTE: Bit of a hack, as heatmap series doesn't yet support scrolling data properly.
const waterfallAxisX = waterfallChart.addAxisX().setStrokeStyle(emptyLine).setTickStrategy(AxisTickStrategies.Empty)
// Control visible X Axis interval by scrolling intensity chart X Axis
distanceIntensityAxisX.onScaleChange((start, end) => waterfallChart.getDefaultAxisX().setInterval(start, end, false, false))
// Disable mouse interactions that affect Axes.
waterfallChart.getDefaultAxisX().setMouseInteractions(false)
waterfallChart.setMouseInteractions(false)
distanceIntensityAxisX.setMouseInteractions(false)
distanceIntensityChart.setMouseInteractions(false)
// Disable default auto cursors.
distanceIntensityChart.setAutoCursorMode(AutoCursorModes.disabled)
waterfallChart.setAutoCursorMode(AutoCursorModes.disabled)

const waterfallSeries = waterfallChart
    .addHeatmapSeries({
        xAxis: waterfallAxisX,
        type: IntensitySeriesTypes.Grid,
        columns: CONFIG.timeDomain,
        rows: CONFIG.waterfallSampleSize,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
        pixelate: true,
    })
    .setWireframeStyle(new SolidFill({ color: ColorRGBA(0, 255, 0, 100) }))
    .setFillStyle(
        new PalettedFill({
            lookUpProperty: 'value',
            lut: new LUT({
                interpolate: true,
                steps: [
                    // { value: 0, color: ColorRGBA(0, 0, 0, 0) },
                    // { value: 199, color: ColorRGBA(0, 0, 0, 0) },
                    { value: 200, color: ColorRGBA(96, 146, 237) },
                    { value: 300, color: ColorRGBA(0, 0, 255) },
                    { value: 400, color: ColorRGBA(255, 215, 0) },
                    { value: 500, color: ColorRGBA(255, 164, 0) },
                    { value: 600, color: ColorRGBA(255, 64, 0) },
                    { value: 50000, color: ColorRGBA(255, 0, 0) },
                ],
            }),
        }),
    )

let xPos = 1
const addSample = (waterfallSampleValues: number[]) => {
    waterfallSeries.addColumn(1, 'value', [waterfallSampleValues])
    const total = waterfallSampleValues.reduce((prev, cur) => prev + cur, 0)
    distanceIntensitySeries.add({
        x: xPos,
        y: total,
    })
    xPos += 1
}

Promise.all(
    new Array(CONFIG.waterfallSampleSize).fill(undefined).map((_, i) =>
        // This is just a random scattered x,y data generator.
        createWhiteNoiseGenerator()
            .setNumberOfPoints(1000)
            .generate()
            .toPromise()
            .then((dataXY) => {
                // Remove X data, map to number array (Y) only.
                return dataXY.map((xy) => xy.y)
            })
            .then((dataY) => {
                // Map [-1, 1] to [200, 1000]
                return dataY.map((y) => 200 + ((y + 1) / 2) * 800)
            }),
    ),
)
    .then((chDataSets) => {
        // Map individual data sets into single data set with values of all channels.
        return chDataSets[0].map((_, iSample) => {
            const waterfallSampleValues: number[] = []
            for (let iCh = 0; iCh < CONFIG.waterfallSampleSize; iCh += 1) {
                waterfallSampleValues[iCh] = chDataSets[iCh][iSample]
            }
            return waterfallSampleValues
        })
    })
    .then((waterFallSamplesData) => {
        let iData = 0
        const pushData = () => {
            const nData = iData++ % waterFallSamplesData.length
            const waterfallSampleValues = waterFallSamplesData[nData]
            addSample(waterfallSampleValues)
            
            // Hack required due to bug in library. Re-rendering is not applied unless style is updated.
            waterfallSeries.setFillStyle(
                new PalettedFill({
                    lookUpProperty: 'value',
                    lut: new LUT({
                        interpolate: true,
                        steps: [
                            // { value: 0, color: ColorRGBA(0, 0, 0, 0) },
                            // { value: 199, color: ColorRGBA(0, 0, 0, 0) },
                            { value: 200, color: ColorRGBA(96, 146, 237) },
                            { value: 300, color: ColorRGBA(0, 0, 255) },
                            { value: 400, color: ColorRGBA(255, 215, 0) },
                            { value: 500, color: ColorRGBA(255, 164, 0) },
                            { value: 600, color: ColorRGBA(255, 64, 0) },
                            { value: 50000, color: ColorRGBA(255, 0, 0) },
                        ],
                    }),
                }),
            )

            // requestAnimationFrame(pushData)
            setTimeout(pushData, 1000)
        }
        pushData()
    })
