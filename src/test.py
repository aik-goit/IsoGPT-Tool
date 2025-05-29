import torch

# Check if PyTorch is using CUDA
print("CUDA available:", torch.cuda.is_available())

# Check the version of CUDA PyTorch is using
print("CUDA version used by PyTorch:", torch.version.cuda)

# Check which device PyTorch is running on
print("Current device:", torch.cuda.current_device())
print("Device name:", torch.cuda.get_device_name(torch.cuda.current_device()))


print("second")
print(torch.__version__)
print(torch.version.cuda)
print(torch.cuda.is_available())
