"""
Data Explorer for Mastitis Detection Dataset
Provides utilities for dataset analysis and visualization.
"""
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image
import seaborn as sns

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

class DataExplorer:
    """Explore and visualize dataset."""
    
    def __init__(self, dataset_path='dataset/train'):
        self.dataset_path = Path(dataset_path)
        self.df = None
        self.images = {}
    
    def load_images_sample(self, max_per_class=5):
        """Load sample images from dataset."""
        self.images = {'mastitis': [], 'normal': []}
        
        # Load mastitis samples
        mastitis_dir = self.dataset_path / 'mastitis'
        if mastitis_dir.exists():
            for img_file in list(mastitis_dir.glob('*.jpg'))[:max_per_class] + list(mastitis_dir.glob('*.png'))[:max_per_class]:
                try:
                    img = Image.open(img_file)
                    self.images['mastitis'].append(img)
                except:
                    pass
        
        # Load normal samples
        normal_dir = self.dataset_path / 'normal'
        if normal_dir.exists():
            for img_file in list(normal_dir.glob('*.jpg'))[:max_per_class] + list(normal_dir.glob('*.png'))[:max_per_class]:
                try:
                    img = Image.open(img_file)
                    self.images['normal'].append(img)
                except:
                    pass
    
    def count_images(self):
        """Count images in dataset."""
        counts = {'mastitis': 0, 'normal': 0}
        
        mastitis_dir = self.dataset_path / 'mastitis'
        if mastitis_dir.exists():
            counts['mastitis'] = len(list(mastitis_dir.glob('*.jpg'))) + len(list(mastitis_dir.glob('*.png')))
        
        normal_dir = self.dataset_path / 'normal'
        if normal_dir.exists():
            counts['normal'] = len(list(normal_dir.glob('*.jpg'))) + len(list(normal_dir.glob('*.png')))
        
        return counts
    
    def plot_class_distribution(self, output_path=None):
        """Plot class distribution."""
        counts = self.count_images()
        
        fig, ax = plt.subplots(figsize=(8, 6))
        
        classes = list(counts.keys())
        values = list(counts.values())
        colors = ['#FF6B6B', '#4ECDC4']
        
        ax.bar(classes, values, color=colors, alpha=0.8)
        ax.set_ylabel('Count')
        ax.set_title('Dataset Class Distribution')
        ax.set_ylim(0, max(values) * 1.1)
        
        # Add value labels on bars
        for i, v in enumerate(values):
            ax.text(i, v + 1, str(v), ha='center', va='bottom', fontweight='bold')
        
        plt.tight_layout()
        
        if output_path:
            plt.savefig(output_path, dpi=100, bbox_inches='tight')
        
        return fig
    
    def plot_sample_images(self, output_path=None):
        """Plot sample images from each class."""
        if not self.images['mastitis'] and not self.images['normal']:
            self.load_images_sample()
        
        max_samples = max(len(self.images['mastitis']), len(self.images['normal']))
        
        fig, axes = plt.subplots(2, max_samples, figsize=(15, 6))
        
        if max_samples == 1:
            axes = axes.reshape(-1, 1)
        
        # Mastitis samples
        for i, img in enumerate(self.images['mastitis']):
            axes[0, i].imshow(img)
            axes[0, i].set_title(f'Mastitis {i+1}', fontweight='bold', color='red')
            axes[0, i].axis('off')
        
        # Normal samples
        for i, img in enumerate(self.images['normal']):
            axes[1, i].imshow(img)
            axes[1, i].set_title(f'Normal {i+1}', fontweight='bold', color='green')
            axes[1, i].axis('off')
        
        plt.tight_layout()
        
        if output_path:
            plt.savefig(output_path, dpi=100, bbox_inches='tight')
        
        return fig
    
    def plot_csv_data_distribution(self, csv_path='dataset/mastitis_data.csv', output_path=None):
        """Plot distribution of numerical features from CSV."""
        try:
            df = pd.read_csv(csv_path)
            
            # Select numerical columns
            numerical_cols = df.select_dtypes(include=[np.number]).columns
            
            # Skip label columns
            numerical_cols = [col for col in numerical_cols if col.lower() not in ['label', 'mastitis', 'id']]
            
            if len(numerical_cols) == 0:
                print("No numerical columns found")
                return None
            
            # Create subplots
            n_cols = min(3, len(numerical_cols))
            n_rows = (len(numerical_cols) + n_cols - 1) // n_cols
            
            fig, axes = plt.subplots(n_rows, n_cols, figsize=(15, 5*n_rows))
            axes = axes.flatten() if n_rows * n_cols > 1 else [axes]
            
            # Plot each column
            for i, col in enumerate(numerical_cols):
                if i < len(axes):
                    # Try to get label if available
                    if 'mastitis' in df.columns or 'label' in df.columns:
                        label_col = 'mastitis' if 'mastitis' in df.columns else 'label'
                        mastitis_data = df[df[label_col] == 1][col]
                        normal_data = df[df[label_col] == 0][col]
                        
                        axes[i].hist(normal_data, alpha=0.6, label='Normal', bins=20, color='green')
                        axes[i].hist(mastitis_data, alpha=0.6, label='Mastitis', bins=20, color='red')
                        axes[i].legend()
                    else:
                        axes[i].hist(df[col], alpha=0.7, bins=20, color='blue')
                    
                    axes[i].set_title(col)
                    axes[i].set_xlabel('Value')
                    axes[i].set_ylabel('Frequency')
            
            # Remove empty subplots
            for i in range(len(numerical_cols), len(axes)):
                fig.delaxes(axes[i])
            
            plt.tight_layout()
            
            if output_path:
                plt.savefig(output_path, dpi=100, bbox_inches='tight')
            
            return fig
        except FileNotFoundError:
            print(f"CSV file not found: {csv_path}")
            return None
    
    def get_summary_stats(self):
        """Get summary statistics."""
        counts = self.count_images()
        total = sum(counts.values())
        
        stats = {
            'total_images': total,
            'mastitis_count': counts['mastitis'],
            'normal_count': counts['normal'],
            'mastitis_percentage': (counts['mastitis'] / total * 100) if total > 0 else 0,
            'normal_percentage': (counts['normal'] / total * 100) if total > 0 else 0,
            'class_imbalance_ratio': counts['mastitis'] / counts['normal'] if counts['normal'] > 0 else 0
        }
        
        return stats


if __name__ == '__main__':
    explorer = DataExplorer()
    
    # Get summary
    stats = explorer.get_summary_stats()
    print("\nDataset Summary:")
    print(f"  Total Images: {stats['total_images']}")
    print(f"  Mastitis: {stats['mastitis_count']} ({stats['mastitis_percentage']:.1f}%)")
    print(f"  Normal: {stats['normal_count']} ({stats['normal_percentage']:.1f}%)")
    print(f"  Class Imbalance Ratio: {stats['class_imbalance_ratio']:.2f}")
    
    # Plot class distribution
    explorer.plot_class_distribution('results/dataset_distribution.png')
    print("\n✓ Distribution plot saved")
    
    # Plot sample images
    explorer.plot_sample_images('results/sample_images.png')
    print("✓ Sample images saved")
