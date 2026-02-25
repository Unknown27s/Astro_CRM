// ML Service for K-means clustering and customer segmentation

interface Point {
    values: number[];
    originalIndex: number;
}

interface Cluster {
    centroid: number[];
    points: number[];
}

// Prepare customer features for clustering
export function prepareCustomerFeatures(customerData: any[]): number[][] {
    // Extract features: total_value, purchase_count, avg_order_value, days_since_last_purchase
    const rawFeatures = customerData.map(customer => [
        customer.total_value || 0,
        customer.purchase_count || 0,
        customer.avg_order_value || 0,
        customer.days_since_last_purchase || 0
    ]);

    // Normalize features to 0-1 range
    return normalizeFeatures(rawFeatures);
}

// Normalize features using min-max normalization
function normalizeFeatures(features: number[][]): number[][] {
    if (features.length === 0) return [];

    const numFeatures = features[0].length;
    const mins: number[] = [];
    const maxs: number[] = [];

    // Find min and max for each feature
    for (let i = 0; i < numFeatures; i++) {
        const values = features.map(f => f[i]);
        mins.push(Math.min(...values));
        maxs.push(Math.max(...values));
    }

    // Normalize
    return features.map(feature =>
        feature.map((value, i) => {
            const range = maxs[i] - mins[i];
            return range === 0 ? 0 : (value - mins[i]) / range;
        })
    );
}

// K-means clustering implementation
export async function performKMeansClustering(
    data: number[][],
    k: number,
    maxIterations: number = 100
): Promise<Cluster[]> {
    if (data.length < k) {
        throw new Error(`Not enough data points. Need at least ${k} points for ${k} clusters.`);
    }

    // Initialize centroids using k-means++ algorithm
    let centroids = initializeCentroidsKMeansPlusPlus(data, k);
    let clusters: Cluster[] = [];
    let converged = false;
    let iteration = 0;

    while (!converged && iteration < maxIterations) {
        // Assign points to nearest centroid
        clusters = assignPointsToClusters(data, centroids);

        // Calculate new centroids
        const newCentroids = calculateNewCentroids(data, clusters);

        // Check for convergence
        converged = centroidsEqual(centroids, newCentroids);
        centroids = newCentroids;
        iteration++;
    }

    return clusters;
}

// K-means++ initialization for better initial centroids
function initializeCentroidsKMeansPlusPlus(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];

    // Choose first centroid randomly
    const firstIndex = Math.floor(Math.random() * data.length);
    centroids.push([...data[firstIndex]]);

    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
        const distances = data.map(point => {
            const minDist = Math.min(...centroids.map(c => euclideanDistance(point, c)));
            return minDist * minDist;
        });

        const totalDist = distances.reduce((sum, d) => sum + d, 0);
        let random = Math.random() * totalDist;

        for (let j = 0; j < distances.length; j++) {
            random -= distances[j];
            if (random <= 0) {
                centroids.push([...data[j]]);
                break;
            }
        }
    }

    return centroids;
}

// Assign each point to the nearest centroid
function assignPointsToClusters(data: number[][], centroids: number[][]): Cluster[] {
    const clusters: Cluster[] = centroids.map(centroid => ({
        centroid: [...centroid],
        points: []
    }));

    data.forEach((point, index) => {
        let minDistance = Infinity;
        let closestCluster = 0;

        centroids.forEach((centroid, clusterIndex) => {
            const distance = euclideanDistance(point, centroid);
            if (distance < minDistance) {
                minDistance = distance;
                closestCluster = clusterIndex;
            }
        });

        clusters[closestCluster].points.push(index);
    });

    return clusters;
}

// Calculate new centroids as mean of assigned points
function calculateNewCentroids(data: number[][], clusters: Cluster[]): number[][] {
    return clusters.map(cluster => {
        if (cluster.points.length === 0) {
            return cluster.centroid; // Keep old centroid if no points assigned
        }

        const numFeatures = data[0].length;
        const newCentroid: number[] = new Array(numFeatures).fill(0);

        cluster.points.forEach(pointIndex => {
            data[pointIndex].forEach((value, featureIndex) => {
                newCentroid[featureIndex] += value;
            });
        });

        return newCentroid.map(sum => sum / cluster.points.length);
    });
}

// Calculate Euclidean distance between two points
function euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
        point1.reduce((sum, value, index) => {
            const diff = value - point2[index];
            return sum + diff * diff;
        }, 0)
    );
}

// Check if centroids have converged
function centroidsEqual(centroids1: number[][], centroids2: number[][], epsilon: number = 0.0001): boolean {
    return centroids1.every((centroid, index) =>
        centroid.every((value, featureIndex) =>
            Math.abs(value - centroids2[index][featureIndex]) < epsilon
        )
    );
}

// Predict cluster for new data point
export function predictCluster(point: number[], centroids: number[][]): number {
    let minDistance = Infinity;
    let closestCluster = 0;

    centroids.forEach((centroid, index) => {
        const distance = euclideanDistance(point, centroid);
        if (distance < minDistance) {
            minDistance = distance;
            closestCluster = index;
        }
    });

    return closestCluster;
}
