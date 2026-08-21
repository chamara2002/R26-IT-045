"""Numerical data preprocessing pipeline for mastitis detection."""
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
import pickle

class NumericalPreprocessor:
    """Handles numerical health data preprocessing."""

    def __init__(self, scaler_type='standard'):
        """
        Initialize preprocessor.

        Args:
            scaler_type: 'standard' (z-score) or 'minmax' (0-1 normalization)
        """
        if scaler_type == 'standard':
            self.scaler = StandardScaler()
        elif scaler_type == 'minmax':
            self.scaler = MinMaxScaler()
        else:
            raise ValueError(f"Unknown scaler type: {scaler_type}")

        self.feature_names = None
        self.scaler_type = scaler_type

    def prepare_features(self, df):
        """
        Extract and prepare numerical features.

        Args:
            df: Pandas DataFrame from CSV

        Returns:
            Tuple of (features_array, labels_array, feature_names)
        """
        # Define model features: exactly 4 inputs
        feature_cols = [
            'Breed',
            'Months after giving birth',
            'Previous_Mastits_status',
            'Temperature'
        ]

        self.feature_names = feature_cols

    def transform(self, data):
        """Transform data using fitted scaler (for inference)."""
        if self.scaler is None:
            raise ValueError("Scaler not fitted. Call prepare_features first.")

        # Handle both DataFrame and numpy array inputs
        if isinstance(data, pd.DataFrame):
            X = data[self.feature_names].values
        else:
            # Assume numpy array with correct feature order
            X = np.asarray(data)
            if len(X.shape) == 1:
                X = X.reshape(1, -1)

        X = np.nan_to_num(X, nan=np.nanmean(X, axis=0))
        return self.scaler.transform(X)

    def save_scaler(self, filepath='scaler.pkl'):
        """Save fitted scaler for inference."""
        with open(filepath, 'wb') as f:
            pickle.dump(self.scaler, f)
        print(f"✓ Scaler saved to {filepath}")

    def load_scaler(self, filepath='scaler.pkl'):
        """Load fitted scaler for inference."""
        with open(filepath, 'rb') as f:
            self.scaler = pickle.load(f)
        print(f"✓ Scaler loaded from {filepath}")


class DataBalancer:
    """Handles class imbalance using various strategies."""

    @staticmethod
    def oversample_minority(X, y, random_state=42):
        """Oversample minority class to balance dataset."""
        from sklearn.utils import resample

        # Separate classes
        X_healthy = X[y == 0]
        X_mastitis = X[y == 1]
        y_healthy = y[y == 0]
        y_mastitis = y[y == 1]

        # Oversample minority class
        if len(X_healthy) > len(X_mastitis):
            X_mastitis_resampled, y_mastitis_resampled = resample(
                X_mastitis, y_mastitis,
                n_samples=len(X_healthy),
                random_state=random_state
            )
            X_balanced = np.vstack([X_healthy, X_mastitis_resampled])
            y_balanced = np.hstack([y_healthy, y_mastitis_resampled])
        else:
            X_healthy_resampled, y_healthy_resampled = resample(
                X_healthy, y_healthy,
                n_samples=len(X_mastitis),
                random_state=random_state
            )
            X_balanced = np.vstack([X_healthy_resampled, X_mastitis])
            y_balanced = np.hstack([y_healthy_resampled, y_mastitis])

        print(f"✓ Data balanced (oversampling): {len(X_balanced)} samples")
        print(f"  Class 0: {sum(y_balanced == 0)}")
        print(f"  Class 1: {sum(y_balanced == 1)}")

        return X_balanced, y_balanced


class NumericalDatasetBuilder:
    """Builds numerical dataset with train-val-test split."""

    def __init__(self, csv_path='dataset/mastitis_data.csv', scaler_type='standard'):
        self.csv_path = Path(csv_path)
        self.preprocessor = NumericalPreprocessor(scaler_type=scaler_type)

    def load_and_prepare(self, balance=True):
        """Load CSV and prepare numerical features."""
        print("Loading numerical data from CSV...")
        df = pd.read_csv(self.csv_path)

        print(f"Dataset shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")

        # Prepare features
        X, y, feature_names = self.preprocessor.prepare_features(df)

        # Balance if needed
        if balance:
            X, y = DataBalancer.oversample_minority(X, y)

        # Print class distribution
        print(f"\nClass distribution:")
        print(f"  Healthy (0): {sum(y == 0)} ({sum(y == 0)/len(y)*100:.1f}%)")
        print(f"  Mastitis (1): {sum(y == 1)} ({sum(y == 1)/len(y)*100:.1f}%)")

        return X, y, feature_names

    def split_data(self, X, y, test_size=0.2, val_size=0.1, random_state=42):
        """Split into train-val-test with stratification."""
        # Split into train+val and test
        X_temp, X_test, y_temp, y_test = train_test_split(
            X, y,
            test_size=test_size,
            stratify=y,
            random_state=random_state
        )

        # Split train+val into train and val
        val_size_adjusted = val_size / (1 - test_size)
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp,
            test_size=val_size_adjusted,
            stratify=y_temp,
            random_state=random_state
        )

        print(f"\n--- DATA SPLIT ---")
        print(f"Train: {len(X_train)} ({len(X_train)/len(X)*100:.1f}%)")
        print(f"  - Healthy: {sum(y_train == 0)}")
        print(f"  - Mastitis: {sum(y_train == 1)}")
        print(f"Validation: {len(X_val)} ({len(X_val)/len(X)*100:.1f}%)")
        print(f"  - Healthy: {sum(y_val == 0)}")
        print(f"  - Mastitis: {sum(y_val == 1)}")
        print(f"Test: {len(X_test)} ({len(X_test)/len(X)*100:.1f}%)")
        print(f"  - Healthy: {sum(y_test == 0)}")
        print(f"  - Mastitis: {sum(y_test == 1)}")

        return X_train, X_val, X_test, y_train, y_val, y_test

    def save_preprocessor(self, filepath='numerical_preprocessor.pkl'):
        """Save fitted preprocessor for inference."""
        with open(filepath, 'wb') as f:
            pickle.dump(self.preprocessor, f)
        print(f"✓ Preprocessor saved to {filepath}")


if __name__ == '__main__':
    builder = NumericalDatasetBuilder()
    X, y, feature_names = builder.load_and_prepare(balance=True)
    X_train, X_val, X_test, y_train, y_val, y_test = builder.split_data(X, y)

    # Save preprocessor
    builder.save_preprocessor()
